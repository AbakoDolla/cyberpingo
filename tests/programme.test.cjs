// Tests of the Réseaux programme seed (supabase/seed/05_reseaux_programme.sql): the reorganisation of the
// published course never deletes or overwrites anything, the answer keys of the five new labs agree with the
// files learners download (recomputed here from the files, independently of the generators), and a learner can
// complete the whole programme and earn every skill and badge.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { OUTPUT_DIR } = require("../scripts/generate-lab-assets.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { root } = require("../scripts/ts-loader.cjs");

const SEED_DIR = path.join(root, "supabase", "seed");
const read = (name) => fs.readFileSync(path.join(OUTPUT_DIR, name), "utf8");
const seed = (name) => fs.readFileSync(path.join(SEED_DIR, name), "utf8");
const course = (key) => contentId("course", key);
const module_ = (key) => contentId("module", key);
const lesson = (key) => contentId("lesson", key);
const lab = (key) => contentId("lab", key);

const opened = [];
async function open({ upTo }) {
  const db = await createSupabaseDatabase({ seed: false });
  opened.push(db);
  for (const file of fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (file < upTo || file === upTo) await db.exec(seed(file));
  }
  return db;
}
after(async () => { for (const db of opened) await db.close(); });

function helpers(db) {
  const sql = async (text, params = []) => (await db.query(text, params)).rows;
  async function as(uid, text, params = []) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.headers', '', false)", [uid ?? ""]);
    await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
    try {
      return (await db.query(text, params)).rows;
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }
  const rpc = async (uid, fn, args = {}) => {
    const names = Object.keys(args);
    const call = `select public.${fn}(${names.map((name, index) => `${name} => $${index + 1}`).join(", ")}) as r`;
    return (await as(uid, call, names.map((name) => args[name])))[0].r;
  };
  async function createUser(email) {
    return (await sql("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, { display_name: email.split("@")[0] }]))[0].id;
  }
  async function study(uid, id) {
    await rpc(uid, "start_lesson", { p_lesson_id: id });
    await sql("update public.lesson_progress set started_at = now() - interval '60 seconds' where user_id = $1 and lesson_id = $2", [uid, id]);
    return rpc(uid, "complete_lesson", { p_lesson_id: id });
  }
  async function passQuiz(uid, quizId) {
    const rows = await sql(`select q.id as question, (array_agg(a.id order by a.position) filter (where a.is_correct)) as answers
      from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id where q.quiz_id = $1 group by q.id`, [quizId]);
    return rpc(uid, "submit_quiz", { p_quiz_id: quizId, p_answers: Object.fromEntries(rows.map((row) => [row.question, row.answers])) });
  }
  async function solveLab(uid, labId) {
    const tasks = await sql(`select t.id, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position`, [labId]);
    let result;
    for (const task of tasks) result = await rpc(uid, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] });
    return result;
  }
  const answers = async (labSlug) => (await sql(`select t.position, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id
    where t.lab_id = $1 order by t.position`, [lab(labSlug)])).map((row) => row.accepted);
  return { sql, as, rpc, createUser, study, passQuiz, solveLab, answers };
}

test("the programme reorganises the published Réseaux course without deleting or overwriting anything", async () => {
  const db = await open({ upTo: "04_mascot_voices.sql" });
  const { sql, rpc, createUser, study, passQuiz } = helpers(db);

  const before = await sql("select id, title from public.lessons where course_id = $1 order by title", [course("c2")]);
  assert.equal(before.length, 10);
  const eva = await createUser("eva@example.test");
  await study(eva, lesson("l1"));
  const dnsQuiz = (await sql("select id from public.quizzes where lesson_id = $1", [lesson("l1")]))[0].id;
  assert.equal((await passQuiz(eva, dnsQuiz)).passed, true);

  // An administrator has edited one starter lesson and renamed one module: the seed must respect both.
  await sql("update public.lessons set content = $1 where id = $2", [{ blocks: [{ type: "text", content: "Version éditée par l’équipe." }] }, lesson("l2")]);
  await sql("update public.course_modules set title = 'Adressage (édité)' where id = $1", [module_("c2:3")]);

  await db.exec(seed("05_reseaux_programme.sql"));

  const after_ = await sql("select id, title from public.lessons where course_id = $1", [course("c2")]);
  assert.equal(after_.length, 31);
  for (const row of before) assert.ok(after_.some((entry) => entry.id === row.id), `la leçon « ${row.title} » existe toujours avec le même identifiant`);

  const [dns] = await sql("select jsonb_array_length(content -> 'blocks') as blocks, duration_minutes from public.lessons where id = $1", [lesson("l1")]);
  assert.ok(dns.blocks >= 15, "the untouched starter lesson was upgraded");
  assert.equal(dns.duration_minutes, 20);
  assert.equal((await sql("select count(*)::int as n from public.quizzes where lesson_id = $1", [lesson("l1")]))[0].n, 1, "the DNS lesson keeps its original quiz");
  assert.equal((await sql("select count(*)::int as n from public.quiz_attempts where quiz_id = $1 and user_id = $2 and passed", [dnsQuiz, eva]))[0].n, 1, "the learner’s attempt is kept");
  assert.equal((await sql("select status from public.lesson_progress where lesson_id = $1 and user_id = $2", [lesson("l1"), eva]))[0].status, "completed");

  const [edited] = await sql("select content -> 'blocks' -> 0 ->> 'content' as first, module_id from public.lessons where id = $1", [lesson("l2")]);
  assert.equal(edited.first, "Version éditée par l’équipe.", "an edited starter lesson is never overwritten");
  assert.equal(edited.module_id, module_("c2:4"), "it is still placed in its new module");

  const modules = await sql("select id, title, position from public.course_modules where course_id = $1 order by position", [course("c2")]);
  assert.deepEqual(modules.map((entry) => entry.position), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(modules.find((entry) => entry.id === module_("c2:3")).title, "Adressage (édité)", "a module renamed by an administrator keeps its name");
  assert.equal(modules[0].title, "Fondamentaux des réseaux");
  assert.equal(modules[9].title, "Diagnostic et documentation");
  const orphans = await sql("select count(*)::int as n from public.quizzes q join public.lessons l on l.id = q.lesson_id where q.module_id <> l.module_id");
  assert.equal(orphans[0].n, 0, "a quiz always follows its lesson");

  const [texts] = await sql("select description, estimated_duration from public.courses where id = $1", [course("c2")]);
  assert.match(texts.description, /Dix modules progressifs/);
  const [{ total }] = await sql("select sum(duration_minutes)::int as total from public.lessons where course_id = $1", [course("c2")]);
  assert.equal(texts.estimated_duration, total, "the displayed duration is the sum of the lessons");

  // Running the seed again changes nothing.
  const snapshot = async () => JSON.stringify(await sql(`select
    (select count(*) from public.lessons) as lessons, (select count(*) from public.quiz_questions) as questions,
    (select count(*) from public.labs) as labs, (select count(*) from public.lab_tasks) as tasks, (select count(*) from public.skills) as skills,
    (select count(*) from public.skill_links) as links, (select count(*) from public.badges) as badges, (select sum(jsonb_array_length(content -> 'blocks')) from public.lessons) as blocks`));
  const first = await snapshot();
  await db.exec(seed("05_reseaux_programme.sql"));
  assert.equal(await snapshot(), first);
  assert.ok(Number(JSON.parse(first)[0].lessons) > 0 && (await rpc(eva, "get_my_academy")).skills.length === 21);
});

test("the lessons keep the order of the programme", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const { sql } = helpers(db);
  const lessons = await sql(`select m.position as module, l.position, l.title from public.lessons l
    join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c2")]);
  const modules = new Map();
  for (const row of lessons) modules.set(row.module, [...(modules.get(row.module) ?? []), row.title]);
  assert.deepEqual([...modules.keys()], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual([...modules.values()].map((titles) => titles.length), [3, 3, 2, 2, 3, 4, 5, 2, 3, 4]);
  assert.deepEqual(modules.get(1)[1], "Le modèle OSI en pratique");
  assert.deepEqual(modules.get(6)[0], "Comprendre le fonctionnement du DNS");
  assert.deepEqual(modules.get(7).slice(0, 2), ["Les ports et protocoles réseau", "Le handshake TCP et les ports"]);
  assert.equal(modules.get(10)[2], "Packet Tracer : de la théorie à la pratique");
  for (const [module, titles] of modules) assert.equal(new Set(titles).size, titles.length, `module ${module} : pas de doublon`);
  const positions = await sql("select position, count(*)::int as n from public.lessons where course_id = $1 group by module_id, position having count(*) > 1", [course("c2")]);
  assert.deepEqual(positions, [], "two lessons never share a position in a module");
});

// --- Answer keys against the files --------------------------------------------------------------------------

const toInt = (address) => address.split(".").reduce((total, part) => total * 256 + Number(part), 0);
const toIp = (value) => [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
const block = (address, prefix) => {
  const size = 2 ** (32 - prefix);
  const network = Math.floor(toInt(address) / size) * size;
  return { network: toIp(network), broadcast: toIp(network + size - 1), first: toIp(network + 1), last: toIp(network + size - 2), size };
};
const clock = (value) => { const [h, m, s] = value.split(":"); return Number(h) * 3600 + Number(m) * 60 + Number(s); };

test("the answer keys of the home network lab agree with the files learners download", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const keys = await helpers(db).answers("tp-reseau-domestique");
  const log = read("tp1-ipconfig-pc-salon.log");
  const guide = read("tp1-guide.md");
  assert.equal(keys.length, 12);
  assert.ok(keys[3].includes(/Adresse IPv4\. [. ]*: (\d+\.\d+\.\d+\.\d+)/.exec(log)[1]));
  const obtained = /Bail obtenu[. ]*: \S+ (\d+) \S+ \d+ (\d+:\d+:\d+)/.exec(log);
  const expiring = /Bail expirant[. ]*: \S+ (\d+) \S+ \d+ (\d+:\d+:\d+)/.exec(log);
  const hours = ((Number(expiring[1]) - Number(obtained[1])) * 86400 + clock(expiring[2]) - clock(obtained[2])) / 3600;
  assert.ok(keys[4].includes(String(hours)), "the lease lasts the number of hours asked");
  assert.ok(keys[5].includes(/Serveurs DNS[. ]*: (\S+)/.exec(log)[1]));
  const groups = /Adresse IPv6\.[ .]*: ([0-9a-f:]+)\(préféré\)/.exec(log)[1].split(":");
  assert.ok(keys[6].includes(`${groups.slice(0, 4).join(":")}::/64`));
  const network = /Le réseau local est (\d+\.\d+\.\d+\.\d+)\/24/.exec(guide)[1];
  assert.ok(keys[0].includes(block(network, 24).broadcast));
  const pool = /entre (\d+\.\d+\.\d+\.\d+) et (\d+\.\d+\.\d+\.\d+)/.exec(guide) ?? /plage de (\d+\.\d+\.\d+\.\d+) à (\d+\.\d+\.\d+\.\d+)/.exec(guide);
  assert.ok(keys[1].includes(String(toInt(pool[2]) - toInt(pool[1]) + 1)));
  const printer = /adresse fixe, (\d+\.\d+\.\d+\.\d+)/.exec(guide)[1];
  assert.ok(toInt(printer) < toInt(pool[1]) && keys[2].includes("non"), "the printer is outside the DHCP range");
  assert.ok(keys[7].includes("256") && keys[8].includes("2001:db8:5a00:1::1") && keys[11].includes("overload"));
});

test("the answer keys of the VLAN lab agree with the SW1 outputs", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const keys = await helpers(db).answers("tp-vlan-pme");
  const log = read("tp2-show-sw1.log");
  assert.equal(keys.length, 11);
  const brief = log.split("SW1#show interfaces trunk")[0];
  const section = /\n20 +Employes +active +([\s\S]*?)\n\d+ +\S+ +(?:active|act)/.exec(brief)[1];
  assert.ok(keys[1].includes(String((section.match(/Fa0\/\d+/g) ?? []).length)));
  const trunk = /Port +Mode +Encapsulation +Status +Native vlan\n(\S+) +on +\S+ +trunking +(\d+)/.exec(log);
  assert.ok(keys[2].includes(trunk[1].toLowerCase()));
  assert.ok(keys[4].includes(trunk[2]));
  const allowed = /Vlans allowed on trunk\n\S+ +([\d,]+)/.exec(log)[1];
  assert.ok(keys[3].includes(allowed));
  const created = [...brief.matchAll(/^(\d+) +(\S+) +active/gm)].filter((row) => Number(row[1]) !== 1);
  assert.ok(keys[7].includes(String(created.length)));
  const emptyVlan = created.find((row) => !/Fa0|Gi0/.test(brief.split(row[0])[1].split("\n")[0]));
  assert.ok(keys[10].includes(emptyVlan[1]), "the VLAN with no access port is the management VLAN");
  assert.ok(keys[8].includes("access-list 110 deny ip 10.40.30.0 0.0.0.255 10.40.10.0 0.0.0.255"));
  assert.ok(keys[5].includes("encapsulation dot1q 30"));
});

test("the answer keys of the three-site lab agree with the routing table", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const keys = await helpers(db).answers("tp-multi-sites");
  const log = read("tp3-show-ip-route-siege.log");
  assert.equal(keys.length, 10);
  const learned = [...log.matchAll(/^S +(\S+) \[(\d+)\/\d+\] via (\S+)/gm)];
  assert.deepEqual(learned.map((row) => row[1]), ["10.60.4.0/24"], "only the Nord route is present");
  assert.ok(keys[4].includes("10.60.5.0/24") && !log.includes("10.60.5.0/24 ["), "the missing route is really missing");
  assert.ok(keys[8].includes(learned[0][2]), "the administrative distance is the one shown");
  assert.ok(keys[1].includes(block("172.20.0.4", 30).broadcast) && keys[0].includes("2"));
  assert.ok(keys[5].includes("ip route 10.60.5.0 255.255.255.0 172.20.0.6"));
  assert.ok(keys[2].includes("ip route 10.60.5.0 255.255.255.0 172.20.0.1") && keys[3].includes("ip route 0.0.0.0 0.0.0.0 172.20.0.5"));
  assert.ok(keys[6].includes("10.60.4.0/23"));
  assert.equal(block("10.60.4.0", 23).broadcast, "10.60.5.255", "the two agency networks fit the summary exactly");
});

test("the answer keys of the incident lab agree with the ticket evidence", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const keys = await helpers(db).answers("incident-reseau-kora");
  const log = read("incident-reseau-kora.log");
  assert.equal(keys.length, 13);
  const gateway = /Passerelle par défaut[. ]*: (\S+)/.exec(log)[1];
  assert.ok(keys[0].includes(gateway));
  const reachable = /ping (10\.40\.20\.\d+)\n\nEnvoi[\s\S]*?Réponse de \1 : octets/.exec(log)[1];
  assert.notEqual(reachable, gateway, "the gateway that answers is not the configured one");
  const mac = /Adresse physique[. ]*: ([0-9A-F-]{17})/.exec(log.split("3. Poste PC-Atelier")[1])[1].replace(/-/g, "").toLowerCase();
  const dotted = `${mac.slice(0, 4)}.${mac.slice(4, 8)}.${mac.slice(8)}`;
  const row = new RegExp(`^ +(\\d+) +${dotted.replace(/\./g, "\\.")} +DYNAMIC +(\\S+)`, "m").exec(log);
  assert.ok(keys[3].includes(row[2].toLowerCase()) && keys[4].includes(row[1]));
  const vlanRows = [...log.split("SW1#show vlan brief")[1].split("SW1#show interfaces trunk")[0].matchAll(/^(\d+) +\S+ +active/gm)].map((entry) => Number(entry[1])).filter((id) => id > 1);
  const allowed = /Vlans allowed on trunk\n\S+ +([\d,]+)/.exec(log)[1].split(",").map(Number);
  const missing = vlanRows.filter((id) => !allowed.includes(id));
  assert.deepEqual(missing, [30]);
  assert.ok(keys[6].includes("30") && keys[7].includes("switchport trunk allowed vlan add 30"));
  const rule = /^ +10 (deny ip \S+ \S+ host \S+) \((\d+) matches\)/m.exec(log);
  assert.ok(keys[8].includes(rule[1]) && keys[9].includes(rule[2]) && keys[10].includes("no 10"));
  const times = [...log.matchAll(/^\*Mar 17 (\d+:\d+:\d+)\.\d+: %LINK-3-UPDOWN: Interface \S+, changed state to down/gm)].map((entry) => clock(entry[1]));
  assert.equal(Math.round(Math.abs(times[0] - times[1]) / 60), Number(keys[11][0]));
  assert.ok(keys[5].includes("switchport access vlan 20") && keys[12].includes("ntp"));
});

test("the answer keys of the final project agree with the brief and the inventory", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const keys = await helpers(db).answers("projet-reseau-kora");
  const brief = read("projet-kora-cahier-des-charges.md");
  const inventory = read("projet-kora-inventaire-a-verifier.md");
  assert.equal(keys.length, 17);
  const needs = [...brief.matchAll(/^\| (\S+) \| (\d+) \| (\d+) adresses utilisables \|$/gm)].map((row) => ({ name: row[1], vlan: Number(row[2]), hosts: Number(row[3]) }));
  assert.equal(needs.length, 5);
  assert.deepEqual(needs.map((need) => need.hosts), [...needs.map((need) => need.hosts)].sort((left, right) => right - left), "allocated from the largest need to the smallest");
  let cursor = toInt(/Bloc IPv4 attribué à Kora : (\d+\.\d+\.\d+\.\d+)\//.exec(brief)[1]);
  const plan = needs.map((need) => {
    let prefix = 30;
    while (2 ** (32 - prefix) - 2 < need.hosts) prefix -= 1;
    const subnet = { ...need, prefix, ...block(toIp(cursor), prefix) };
    cursor += subnet.size;
    return subnet;
  });
  const [employes, administration, invites, serveurs, gestion] = plan;
  assert.ok(keys[0].includes(`/${employes.prefix}`) && keys[1].includes(administration.network) && keys[2].includes(invites.broadcast));
  assert.ok(keys[3].includes(serveurs.first) && keys[5].includes(toIp(cursor)));
  assert.ok(keys[4].includes(toIp(2 ** 32 - 2 ** (32 - gestion.prefix))));
  assert.ok(keys[9].includes(toIp(toInt(employes.first) + 10)));
  assert.ok(keys[10].includes(String(toInt(employes.last) - (toInt(employes.first) + 10) + 1)), "the pool runs from the eleventh address to the last usable one");
  const table = [...inventory.split("Inventaire :")[1].matchAll(/^\| (\S+) \| (\d+) \| (\S+) \| (\S+) \| (.*) \|$/gm)].filter((row) => row[1] !== "Équipement");
  const seen = new Map();
  for (const row of table) seen.set(row[3], [...(seen.get(row[3]) ?? []), row[1]]);
  const duplicate = [...seen.entries()].filter(([, names]) => names.length > 1).map(([address]) => address);
  assert.deepEqual(duplicate.length, 1);
  assert.ok(keys[14].includes(duplicate[0]));
  const outside = table.filter((row) => { const subnet = plan.find((item) => item.vlan === Number(row[2])); return toInt(row[3]) < toInt(subnet.network) || toInt(row[3]) > toInt(subnet.broadcast); });
  assert.deepEqual(outside.length, 1);
  assert.ok(keys[15].includes(outside[0][1].toLowerCase()));
  const noGateway = table.filter((row) => row[5].trim() === "");
  assert.deepEqual(noGateway.length, 1);
  assert.ok(keys[16].includes(noGateway[0][1].toLowerCase()));
  const operator = /l’opérateur prend l’adresse (\d+\.\d+\.\d+\.\d+) et Kora l’adresse (\d+\.\d+\.\d+\.\d+)/.exec(brief);
  assert.ok(keys[12].includes(`ip route 0.0.0.0 0.0.0.0 ${operator[1]}`), "the default route points to the operator address of the brief");
  assert.equal(toInt(operator[2]), toInt(operator[1]) + 1, "the operator and Kora share the same /30");
  assert.ok(keys[13].includes(String(plan.length + 1)), "one connected route per VLAN subnet plus the operator link");
  assert.ok(keys[7].includes("65536") && keys[8].includes("2001:db8:4b00:1e::/64") && keys[6].includes(String(1024 / 32)));
});

test("a learner completes the whole programme and earns every skill and badge", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const { sql, as, rpc, createUser, study, passQuiz, solveLab } = helpers(db);
  const fay = await createUser("fay@example.test");

  const lessons = await sql(`select l.id from public.lessons l join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c2")]);
  assert.equal(lessons.length, 31);
  for (const row of lessons) await study(fay, row.id);
  const quizzes = await sql("select id from public.quizzes where course_id = $1", [course("c2")]);
  assert.equal(quizzes.length, 31, "every lesson of the programme has its quiz");
  for (const row of quizzes) {
    await sql("delete from private.rate_events");
    assert.equal((await passQuiz(fay, row.id)).passed, true);
  }

  const labs = await sql("select id, slug from public.labs where course_id = $1 order by position", [course("c2")]);
  assert.equal(labs.length, 9);
  const last = {};
  for (const row of labs) last[row.slug] = await solveLab(fay, row.id);
  assert.equal(last["tp-reseau-domestique"].lab_newly_completed, true);
  assert.equal(last["projet-reseau-kora"].lab_newly_completed, true);

  const academy = await rpc(fay, "get_my_academy");
  const states = Object.fromEntries(academy.skills.map((entry) => [entry.slug, entry.state]));
  const reseaux = Object.entries(states).filter(([slug]) => !["lecture-journaux-linux", "audit-droits-linux", "detection-bruteforce-ssh", "analyse-logs-web", "reconstitution-incident"].includes(slug));
  assert.equal(reseaux.length, 16);
  assert.ok(reseaux.every(([, state]) => state === "validated"), JSON.stringify(states));

  const badges = (await as(fay, "select b.slug from public.user_badges ub join public.badges b on b.id = ub.badge_id")).map((row) => row.slug);
  for (const slug of ["pionnier-ipv6", "maitre-des-vlan", "routeur-confirme", "gardien-des-flux", "depanneur-reseau", "architecte-kora", "expert-reseau"]) assert.ok(badges.includes(slug), `badge ${slug}`);

  const [enrollment] = await as(fay, "select status from public.enrollments where course_id = $1", [course("c2")]);
  assert.equal(enrollment.status, "completed");
});
