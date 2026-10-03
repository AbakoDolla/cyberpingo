const path = require("node:path");

const dayMs = 24 * 60 * 60 * 1000;

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const compact = (values) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const yesNo = (value) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));
const dayDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs);
const tsv = (headers, rows) => `${headers.join("\t")}\n${rows.map((row) => headers.map((header) => row[header] ?? "").join("\t")).join("\n")}\n`;
const mulberry32 = (seed) => () => {
  let state = seed += 0x6D2B79F5;
  state = Math.imul(state ^ (state >>> 15), state | 1);
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
};
const pickChars = (alphabet, length, prng) => Array.from({ length }, () => alphabet[Math.floor(prng() * alphabet.length)]).join("");

function makeFingerprint(prng) {
  return pickChars("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", 43, prng);
}

function makeKeyBlob(keyType, prng) {
  const prefixes = {
    "ssh-ed25519": "AAAAC3NzaC1lZDI1NTE5AAAAI",
    "ecdsa-sha2-nistp256": "AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBB",
    "ssh-rsa": "AAAAB3NzaC1yc2EAAAADAQABAAABAQ",
  };
  return `${prefixes[keyType]}${pickChars("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", 44, prng)}`;
}

function buildTp4() {
  const networkFile = "lnx-tp4-reseau.txt";
  const sshFile = "lnx-tp4-sshd_config.txt";
  const authFile = "lnx-tp4-auth.log";
  const ufwFile = "lnx-tp4-ufw.txt";
  const keysFile = "lnx-tp4-cles.txt";
  const guideFile = "lnx-tp4-guide.md";

  const gateway = "10.20.0.1";
  const iface = "ens18";
  const prefix = 24;
  const sshPort = 2202;
  const permitRootLogin = "prohibit-password";
  const passwordAuthCfall = true;
  const passwordSuccessAccount = "nkamga";
  const firstPasswordSuccessTime = "03:17:42";
  const topFailureIp = "198.51.100.47";
  const failuresBeforeSuccess = 6;
  const invalidUsers = ["admin", "backup", "deploy", "git", "test", "ubuntu"];
  const prng = mulberry32(0x5a17b042);
  const rsaWeakCount = 2;
  const keysWithoutFromCount = 4;
  const wideRuleNumber = 6;
  const decisiveRuleNumber = 4;

  const networkText = [
    "### ip -br a",
    "lo               UNKNOWN        127.0.0.1/8 ::1/128",
    "ens18            UP             10.20.0.10/24 fe80::5054:ff:fe12:3410/64",
    "ens19            DOWN",
    "",
    "### ip r",
    "default via 10.20.0.1 dev ens18 proto static",
    "10.20.0.0/24 dev ens18 proto kernel scope link src 10.20.0.10",
    "",
    "### ip neigh",
    "10.20.0.1 dev ens18 lladdr 52:54:00:11:22:01 REACHABLE",
    "10.20.0.2 dev ens18 lladdr 52:54:00:11:22:02 STALE",
    "10.20.0.100 dev ens18 lladdr 52:54:00:11:22:64 REACHABLE",
    "10.20.0.111 dev ens18 lladdr 52:54:00:11:22:6f DELAY",
    "",
    "### /etc/resolv.conf",
    "search alize.example",
    "nameserver 10.20.0.2",
    "nameserver 10.20.0.3",
    "",
    "### /etc/hosts",
    "127.0.0.1 localhost",
    "127.0.1.1 srv-web01",
    "10.20.0.10 srv-web01.alize.example srv-web01",
    "10.20.0.20 srv-fichiers01.alize.example srv-fichiers01",
    "10.20.0.30 srv-sauvegarde01.alize.example srv-sauvegarde01",
  ].join("\n") + "\n";

  const sshConfigText = [
    "# ===== /etc/ssh/sshd_config =====",
    "Include /etc/ssh/sshd_config.d/*.conf",
    "Port 22",
    "PermitRootLogin no",
    "PasswordAuthentication no",
    "PubkeyAuthentication yes",
    "X11Forwarding no",
    "AllowUsers odiallo nkamga cfall",
    "",
    "# ===== /etc/ssh/sshd_config.d/10-alize-hardening.conf =====",
    "Port 2202",
    "PermitRootLogin prohibit-password",
    "PasswordAuthentication no",
    "LoginGraceTime 30",
    "",
    "# ===== /etc/ssh/sshd_config.d/20-maintenance.conf =====",
    "PasswordAuthentication yes",
    "Match User cfall",
    "    PasswordAuthentication yes",
    "    PubkeyAuthentication yes",
    "Match Address 198.51.100.0/24",
    "    PasswordAuthentication no",
    "    PermitRootLogin no",
    "Match User nkamga Address 10.20.0.100",
    "    X11Forwarding yes",
  ].join("\n") + "\n";

  const authLines = [];
  const failureNoise = [
    { day: "Apr  9", time: "00:14:03", host: "srv-web01", user: "admin", ip: "203.0.113.55", port: 41231 },
    { day: "Apr  9", time: "00:14:05", host: "srv-web01", user: "test", ip: "203.0.113.55", port: 41233 },
    { day: "Apr  9", time: "00:14:08", host: "srv-web01", user: "ubuntu", ip: "203.0.113.55", port: 41235 },
    { day: "Apr  9", time: "00:15:42", host: "srv-web01", user: "backup", ip: "192.0.2.88", port: 43111 },
    { day: "Apr  9", time: "00:15:47", host: "srv-web01", user: "git", ip: "192.0.2.88", port: 43115 },
    { day: "Apr  9", time: "00:15:52", host: "srv-web01", user: "deploy", ip: "192.0.2.88", port: 43118 },
  ];
  for (const row of failureNoise) {
    authLines.push(`${row.day} ${row.time} ${row.host} sshd[${2000 + row.port % 400}]: Failed password for invalid user ${row.user} from ${row.ip} port ${row.port} ssh2`);
  }
  const legitUsers = [
    { time: "00:22:11", user: "odiallo", ip: "10.20.0.100", port: 44118, type: "Accepted publickey", extra: "ED25519 SHA256:QvWnJx2wIyd3jVnVcp4JfQ8W8x2kTrT2wJd2JrR9dPs" },
    { time: "00:23:03", user: "odiallo", ip: "10.20.0.100", port: 44118, type: "pam_unix(sshd:session): session opened for user", extra: "by (uid=0)" },
    { time: "01:04:09", user: "nkamga", ip: "10.20.0.100", port: 44201, type: "Accepted publickey", extra: "RSA SHA256:5RrVn4xT0hG1yZt6qK2xHq3cPj8JdLm0aQy7rN0pWjI" },
    { time: "02:11:09", user: "odiallo", ip: "10.20.0.100", port: 44150, type: "Accepted publickey", extra: "ED25519 SHA256:QvWnJx2wIyd3jVnVcp4JfQ8W8x2kTrT2wJd2JrR9dPs" },
  ];
  for (const row of legitUsers) {
    if (row.type.startsWith("Accepted")) {
      authLines.push(`Apr  9 ${row.time} srv-web01 sshd[${2300 + row.port % 300}]: ${row.type} for ${row.user} from ${row.ip} port ${row.port} ssh2: ${row.extra}`);
    } else {
      authLines.push(`Apr  9 ${row.time} srv-web01 sshd[${2300 + row.port % 300}]: ${row.type} ${row.user} ${row.extra}`);
    }
  }
  const attackBursts = [
    { time: "03:12:11", user: "admin", valid: false, port: 51234 },
    { time: "03:12:28", user: "nkamga", valid: true, port: 51248 },
    { time: "03:13:05", user: "backup", valid: false, port: 51263 },
    { time: "03:14:44", user: "nkamga", valid: true, port: 51291 },
    { time: "03:16:10", user: "nkamga", valid: true, port: 51311 },
    { time: "03:16:55", user: "nkamga", valid: true, port: 51323 },
    { time: "03:17:42", user: "nkamga", valid: true, accepted: true, port: 51341 },
    { time: "03:18:17", user: "nkamga", valid: true, accepted: true, port: 51355 },
  ];
  for (const row of attackBursts) {
    if (row.accepted) {
      authLines.push(`Apr  9 ${row.time} srv-web01 sshd[274${row.port % 10}]: Accepted password for ${row.user} from ${topFailureIp} port ${row.port} ssh2`);
    } else if (row.valid) {
      authLines.push(`Apr  9 ${row.time} srv-web01 sshd[274${row.port % 10}]: Failed password for ${row.user} from ${topFailureIp} port ${row.port} ssh2`);
    } else {
      authLines.push(`Apr  9 ${row.time} srv-web01 sshd[274${row.port % 10}]: Failed password for invalid user ${row.user} from ${topFailureIp} port ${row.port} ssh2`);
    }
  }
  for (let index = 0; index < 260; index += 1) {
    const hour = String((4 + Math.floor(index / 30)) % 24).padStart(2, "0");
    const minute = String((index * 2) % 60).padStart(2, "0");
    const second = String((index * 7) % 60).padStart(2, "0");
    const pid = 3200 + index;
    const kind = index % 5;
    if (kind === 0) authLines.push(`Apr  9 ${hour}:${minute}:${second} srv-web01 sshd[${pid}]: Connection closed by authenticating user odiallo 10.20.0.100 port ${45000 + index} [preauth]`);
    else if (kind === 1) authLines.push(`Apr  9 ${hour}:${minute}:${second} srv-web01 CRON[${pid}]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)`);
    else if (kind === 2) authLines.push(`Apr  9 ${hour}:${minute}:${second} srv-web01 sudo:  odiallo : TTY=pts/0 ; PWD=/home/odiallo ; USER=root ; COMMAND=/usr/bin/systemctl reload nginx`);
    else if (kind === 3) authLines.push(`Apr  9 ${hour}:${minute}:${second} srv-web01 sshd[${pid}]: pam_unix(sshd:session): session closed for user nkamga`);
    else authLines.push(`Apr  9 ${hour}:${minute}:${second} srv-web01 sshd[${pid}]: Received disconnect from 10.20.0.100 port ${46000 + index}:11: disconnected by user`);
  }
  authLines.sort((left, right) => left.localeCompare(right));

  const ufwText = [
    "Status: active",
    "",
    "     To                         Action      From",
    "     --                         ------      ----",
    "[ 1] 2202/tcp                   ALLOW IN    10.20.0.100",
    "[ 2] 80/tcp                     ALLOW IN    Anywhere",
    "[ 3] 443/tcp                    ALLOW IN    Anywhere",
    "[ 4] 2202/tcp                   DENY IN     203.0.113.0/24",
    "[ 5] 2202/tcp                   ALLOW IN    198.51.100.47             # prestataire-temp",
    "[ 6] 22/tcp                     ALLOW IN    Anywhere                   # support-temp",
    "[ 7] 3306/tcp                   DENY IN     Anywhere",
    "[ 8] 2202/tcp                   DENY IN     Anywhere",
    "",
    "Apr  9 03:12:11 srv-web01 kernel: [UFW ALLOW] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=198.51.100.47 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=49 ID=51531 DF PROTO=TCP SPT=51234 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
    "Apr  9 03:12:28 srv-web01 kernel: [UFW ALLOW] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=198.51.100.47 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=49 ID=51532 DF PROTO=TCP SPT=51248 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
    "Apr  9 03:13:05 srv-web01 kernel: [UFW ALLOW] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=198.51.100.47 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=49 ID=51533 DF PROTO=TCP SPT=51263 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
    "Apr  9 03:14:44 srv-web01 kernel: [UFW ALLOW] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=198.51.100.47 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=49 ID=51534 DF PROTO=TCP SPT=51291 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
    "Apr  9 03:17:42 srv-web01 kernel: [UFW ALLOW] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=198.51.100.47 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=49 ID=51535 DF PROTO=TCP SPT=51341 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
    "Apr  9 03:18:17 srv-web01 kernel: [UFW BLOCK] IN=ens18 OUT= MAC=52:54:00:12:34:10 SRC=203.0.113.90 DST=10.20.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=52 ID=51536 DF PROTO=TCP SPT=52341 DPT=2202 WINDOW=64240 RES=0x00 SYN URGP=0",
  ].join("\n") + "\n";

  const keyRecords = [
    { options: 'from="10.20.0.100",no-port-forwarding', keyType: "ssh-ed25519", bits: 256, comment: "odiallo@adm-pc01" },
    { options: 'from="10.20.0.30"', keyType: "ssh-rsa", bits: 4096, comment: "svc-backup@srv-sauvegarde01" },
    { options: 'from="10.20.0.100",command="/usr/local/bin/run-deploy-check"', keyType: "ssh-rsa", bits: 2048, comment: "nkamga-maintenance" },
    { options: 'no-port-forwarding', keyType: "ssh-rsa", bits: 1024, comment: "" },
    { options: 'from="10.20.0.20"', keyType: "ecdsa-sha2-nistp256", bits: 256, comment: "straore-batch" },
    { options: "", keyType: "ssh-ed25519", bits: 256, comment: "cfall-lab" },
    { options: 'from="10.20.0.111"', keyType: "ssh-rsa", bits: 4096, comment: "adm-pc01-fallback" },
    { options: "", keyType: "ssh-rsa", bits: 4096, comment: "websync" },
    { options: 'from="10.20.0.100",no-agent-forwarding', keyType: "ecdsa-sha2-nistp256", bits: 256, comment: "audit-console" },
    { options: "", keyType: "ssh-ed25519", bits: 256, comment: "support-tablette" },
  ].map((record) => ({
    ...record,
    blob: makeKeyBlob(record.keyType, prng),
    fingerprint: makeFingerprint(prng),
  }));
  const keysText = keyRecords
    .map((record) => {
      const left = [record.options, record.keyType, record.blob, record.comment].filter(Boolean).join(" ");
      return `${left} | bits=${record.bits} | SHA256:${record.fingerprint}`;
    })
    .join("\n") + "\n";

  const guideText = [
    "# Guide du TP 4 : réseau, SSH et pare-feu",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives.",
    "> Tu lis des exports déjà produits sur srv-web01, sans toucher à un vrai serveur.",
    "> Ne modifie jamais un vrai fichier sshd_config, ne lance pas de vraie ouverture de port et n’essaie aucun mot de passe sur un système qui n’est pas le tien.",
    "",
    "## Méthode",
    "",
    "1. Dans le fichier réseau, pars de la route par défaut, puis relève l’interface, l’adresse locale et le préfixe du réseau.",
    "2. Dans la configuration SSH concaténée, applique la règle « première valeur obtenue = valeur effective » pour les options globales. Ensuite, seulement si un bloc Match s’applique, lis ses options dans l’ordre. L’ordre d’affichage d’un grep ne prouve donc pas l’ordre de lecture de sshd.",
    "3. Dans auth.log, distingue les réussites légitimes par clé des échecs par mot de passe. Pour retrouver la première réussite par mot de passe, trie mentalement par heure et ignore les clés publiques.",
    "4. Dans le pare-feu, la première règle qui correspond décide du verdict. Une règle générale placée plus bas ne change rien si une règle plus haute a déjà tranché.",
    "5. Pour les clés SSH, applique des règles générales : une clé RSA de moins de 3072 bits est trop courte pour l’administration et une clé d’administration exposée sans restriction « from= » mérite d’être revue.",
    "",
    "## Visionneuse du site",
    "",
    "- Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent, par exemple « Failed password », « Accepted », « ALLOW » ou « DENY ».",
    "- Pour une configuration, filtre sur le nom général d’une directive ou d’une famille d’options, puis relis quelques lignes avant et après pour comprendre le contexte.",
    "",
    "## Exemples de commandes (données inventées)",
    "",
    "```bash",
    "cat > demo-reseau.txt <<'EOF'",
    "default via 192.168.50.1 dev enp0s3",
    "192.168.50.0/27 dev enp0s3 proto kernel scope link src 192.168.50.12",
    "EOF",
    "grep -E '^default via|^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+' demo-reseau.txt",
    "",
    "cat > demo-sshd.txt <<'EOF'",
    "# ===== /etc/ssh/sshd_config =====",
    "Include /etc/ssh/sshd_config.d/*.conf",
    "# ===== /etc/ssh/sshd_config.d/10-demo.conf =====",
    "Port 2222",
    "PermitRootLogin forced-commands-only",
    "Match User demo",
    "    PasswordAuthentication no",
    "EOF",
    "grep -nE '^(Port|PermitRootLogin|PasswordAuthentication|Match )' demo-sshd.txt",
    "",
    "cat > demo-auth.log <<'EOF'",
    "Jun 17 06:11:00 lab sshd[1201]: Failed password for invalid user test from 192.168.60.8 port 41000 ssh2",
    "Jun 17 06:11:11 lab sshd[1202]: Failed password for demo from 192.168.60.8 port 41010 ssh2",
    "Jun 17 06:12:00 lab sshd[1203]: Accepted password for demo from 192.168.60.9 port 41020 ssh2",
    "EOF",
    "top_ip=$(grep 'Failed password' demo-auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -n 1 | awk '{print $2}')",
    "success_line=$(grep 'Accepted password' demo-auth.log | head -n 1)",
    "printf 'Démo auth prête pour compter les échecs par adresse : %s.\\nDémo auth prête pour relire une réussite par mot de passe : %s.\\n' \"$top_ip\" \"$success_line\"",
    "",
    "cat > demo-ufw.txt <<'EOF'",
    "[ 1] 2222/tcp ALLOW IN 192.168.50.0/26",
    "[ 2] 22/tcp DENY IN Anywhere",
    "EOF",
    "grep -nE '^\\[[[:space:]]*[0-9]+\\]' demo-ufw.txt",
    "",
    "cat > demo-keys.txt <<'EOF'",
    "from=\"192.168.50.10\" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest demo-ed25519 | bits=256 | SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdeFG",
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDemo demo-rsa | bits=2048 | SHA256:QwErTyUiOpAsDfGhJkLzXcVbNm1234567890qwertYU",
    "EOF",
    "grep -E 'from=|bits=|SHA256:' demo-keys.txt",
    "```",
    "",
    "## Exemples de commandes PowerShell 5.1 (données inventées)",
    "",
    "```powershell",
    "$demoReseau = @(",
    "  'default via 192.168.50.1 dev enp0s3',",
    "  '192.168.50.0/27 dev enp0s3 proto kernel scope link src 192.168.50.12'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-reseau.txt\" $demoReseau",
    "Get-Content -Encoding UTF8 \"demo-reseau.txt\" | Select-String 'default via|[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+'",
    "",
    "$demoSsh = @(",
    "  '# ===== /etc/ssh/sshd_config =====',",
    "  'Include /etc/ssh/sshd_config.d/*.conf',",
    "  '# ===== /etc/ssh/sshd_config.d/10-demo.conf =====',",
    "  'Port 2222',",
    "  'PermitRootLogin no',",
    "  'Match User demo',",
    "  '    PasswordAuthentication no'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-sshd.txt\" $demoSsh",
    "Get-Content -Encoding UTF8 \"demo-sshd.txt\" | Select-String '^(Port|PermitRootLogin|PasswordAuthentication|Match )'",
    "",
    "$demoAuth = @(",
    "  'Jun 17 06:11:00 lab sshd[1201]: Failed password for invalid user test from 192.168.60.8 port 41000 ssh2',",
    "  'Jun 17 06:11:11 lab sshd[1202]: Failed password for demo from 192.168.60.8 port 41010 ssh2',",
    "  'Jun 17 06:12:00 lab sshd[1203]: Accepted password for demo from 192.168.60.9 port 41020 ssh2'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-auth.log\" $demoAuth",
    "$topIp = Get-Content -Encoding UTF8 \"demo-auth.log\" | Select-String 'Failed password' | ForEach-Object { ($_ -split ' ')[-4] } | Group-Object | Sort-Object Count -Descending | Select-Object -First 1",
    "$successLine = Get-Content -Encoding UTF8 \"demo-auth.log\" | Select-String 'Accepted password' | Select-Object -First 1",
    "\"Démo auth prête pour compter les échecs par adresse : $($topIp.Name).\"",
    "\"Démo auth prête pour relire une réussite par mot de passe : $($successLine.Line).\"",
    "",
    "$demoUfw = @(",
    "  '[ 1] 2222/tcp ALLOW IN 192.168.50.0/26',",
    "  '[ 2] 22/tcp DENY IN Anywhere'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-ufw.txt\" $demoUfw",
    "Get-Content -Encoding UTF8 \"demo-ufw.txt\" | Select-String '^\\[[ ]*[0-9]+\\]'",
    "",
    "$demoKeys = @(",
    "  'from=\"192.168.50.10\" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest demo-ed25519 | bits=256 | SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdeFG',",
    "  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDemo demo-rsa | bits=2048 | SHA256:QwErTyUiOpAsDfGhJkLzXcVbNm1234567890qwertYU'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-keys.txt\" $demoKeys",
    "Get-Content -Encoding UTF8 \"demo-keys.txt\" | Select-String 'from=|bits=|SHA256:'",
    "```",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "## Sur un vrai serveur, seulement si tu l’administres vraiment",
    "",
    "```bash",
    "# hors-test",
    "ss -tulpn | grep sshd",
    "sshd -T | grep -E 'port|permitrootlogin|passwordauthentication'",
    "sudo ufw status numbered",
    "```",
  ].join("\n") + "\n";

  return {
    files: [
      { name: networkFile, data: text(networkText) },
      { name: sshFile, data: text(sshConfigText) },
      { name: authFile, data: text(authLines.join("\n") + "\n") },
      { name: ufwFile, data: text(ufwText) },
      { name: keysFile, data: text(keysText) },
      { name: guideFile, data: text(guideText) },
    ],
    facts: {
      assetNames: { networkFile, sshFile, authFile, ufwFile, keysFile, guideFile },
      gateway,
      interface: iface,
      prefix,
      permitRootLogin,
      passwordAuthenticationCfall: passwordAuthCfall,
      topFailureIp,
      invalidUsersCount: invalidUsers.length,
      firstPasswordSuccessTime,
      passwordSuccessAccount,
      failuresBeforeSuccess,
      ufwWideRuleNumber: wideRuleNumber,
      decisiveRuleNumber,
      rsaWeakCount,
      keysWithoutFromCount,
      sshPort,
    },
  };
}

function buildTp5() {
  const updatesFile = "lnx-tp5-maj.txt";
  const disksFile = "lnx-tp5-disques.txt";
  const fstabFile = "lnx-tp5-fstab.txt";
  const backupLogFile = "lnx-tp5-sauvegarde.log";
  const snapshotsFile = "lnx-tp5-instantanes.txt";
  const copiesFile = "lnx-tp5-copies.txt";
  const scriptFile = "lnx-tp5-sauvegarde.sh";
  const guideFile = "lnx-tp5-guide.md";

  const upgradable = [
    "base-files/noble-updates 13ubuntu10.2 amd64 [upgradable from: 13ubuntu10.1]",
    "bash/noble-updates 5.2.21-2ubuntu4.1 amd64 [upgradable from: 5.2.21-2ubuntu4]",
    "ca-certificates/noble-updates,noble-security 20240203 all [upgradable from: 20240110]",
    "curl/noble-updates 8.5.0-2ubuntu10.5 amd64 [upgradable from: 8.5.0-2ubuntu10.4]",
    "libarchive13/noble-security 3.7.2-2ubuntu0.3 amd64 [upgradable from: 3.7.2-2ubuntu0.2]",
    "libpam-modules/noble-updates 1.5.3-5ubuntu5.3 amd64 [upgradable from: 1.5.3-5ubuntu5.2]",
    "libpam-runtime/noble-updates 1.5.3-5ubuntu5.3 all [upgradable from: 1.5.3-5ubuntu5.2]",
    "libpam0g/noble-updates 1.5.3-5ubuntu5.3 amd64 [upgradable from: 1.5.3-5ubuntu5.2]",
    "linux-image-generic/noble-updates 6.8.0-41.41 amd64 [upgradable from: 6.8.0-39.39]",
    "openssh-client/noble-security 1:9.6p1-3ubuntu13.12 amd64 [upgradable from: 1:9.6p1-3ubuntu13.10]",
    "openssh-server/noble-security 1:9.6p1-3ubuntu13.12 amd64 [upgradable from: 1:9.6p1-3ubuntu13.10]",
    "openssl/noble-security 3.0.13-0ubuntu3.6 amd64 [upgradable from: 3.0.13-0ubuntu3.5]",
    "python3/noble-updates 3.12.3-0ubuntu2 amd64 [upgradable from: 3.12.3-0ubuntu1]",
    "rsync/noble-updates 3.2.7-1ubuntu1.3 amd64 [upgradable from: 3.2.7-1ubuntu1.2]",
    "sudo/noble-security 1.9.15p5-3ubuntu5.1 amd64 [upgradable from: 1.9.15p5-3ubuntu5]",
    "systemd/noble-updates 255.4-1ubuntu8.5 amd64 [upgradable from: 255.4-1ubuntu8.4]",
  ];

  const updatesText = [
    "### /etc/os-release",
    "PRETTY_NAME=\"Ubuntu 24.04.1 LTS\"",
    "NAME=\"Ubuntu\"",
    "VERSION_ID=\"24.04\"",
    "VERSION=\"24.04.1 LTS (Noble Numbat)\"",
    "ID=ubuntu",
    "ID_LIKE=debian",
    "",
    "### apt list --upgradable",
    "Listing...",
    ...upgradable,
  ].join("\n") + "\n";

  const disksText = [
    "### df -h",
    "Filesystem      Size  Used Avail Use% Mounted on",
    "/dev/vda1        40G   37G  1.9G  96% /",
    "/dev/vdb1       160G  123G   29G  81% /srv",
    "/dev/vdc1        12G  4.2G  6.8G  39% /var/log",
    "/dev/vdd1       200G  191G  6.0G  97% /backup/local",
    "tmpfs           2.0G   24M  2.0G   2% /tmp",
    "",
    "### df -i",
    "Filesystem      Inodes  IUsed   IFree IUse% Mounted on",
    "/dev/vda1      2621440 412281 2209159   16% /",
    "/dev/vdb1      5242880 913220 4329660   18% /srv",
    "/dev/vdc1       786432 748390   38042   95% /var/log",
    "/dev/vdd1      2621440 109030 2512410    5% /backup/local",
    "tmpfs           524288    104  524184    1% /tmp",
    "",
    "### lsblk -f",
    "NAME   FSTYPE FSVER LABEL        UUID                                 FSAVAIL FSUSE% MOUNTPOINTS",
    "vda                                                                               ",
    "└─vda1 ext4   1.0   rootfs       4b7d0d1d-a4b8-49ce-b8cf-0f8fd73b1111    1.9G    96% /",
    "vdb                                                                               ",
    "└─vdb1 ext4   1.0   partages     6f8c1e7d-854a-4f7a-b3f8-cf1912342222     29G    81% /srv",
    "vdc                                                                               ",
    "└─vdc1 xfs          journaux     14587f57-b230-4e22-bbf5-6a2144553333    6.8G    39% /var/log",
    "vdd                                                                               ",
    "└─vdd1 ext4   1.0   sauvegardes  7fe1b260-83cf-48f1-a2a6-7d0b99884444    6.0G    97% /backup/local",
    "",
    "### findmnt",
    "TARGET         SOURCE    FSTYPE OPTIONS",
    "/              /dev/vda1 ext4   rw,relatime,errors=remount-ro",
    "/srv           /dev/vdb1 ext4   rw,relatime",
    "/var/log       /dev/vdc1 xfs    rw,relatime,nodev,nosuid",
    "/backup/local  /dev/vdd1 ext4   rw,relatime,nodev,nosuid",
    "/tmp           tmpfs     tmpfs  rw,nosuid,nodev,relatime,size=2048M",
  ].join("\n") + "\n";

  const fstabText = [
    "# /etc/fstab",
    "UUID=4b7d0d1d-a4b8-49ce-b8cf-0f8fd73b1111 /             ext4 defaults,errors=remount-ro 0 1",
    "UUID=6f8c1e7d-854a-4f7a-b3f8-cf1912342222 /srv          ext4 defaults                  0 2",
    "UUID=14587f57-b230-4e22-bbf5-6a2144553333 /var/log      xfs  defaults,nodev,nosuid     0 2",
    "UUID=7fe1b260-83cf-48f1-a2a6-7d0b99884444 /backup/local ext4 defaults,nodev,nosuid     0 2",
    "tmpfs                                   /tmp          tmpfs rw,nosuid,nodev,size=2G  0 0",
    "UUID=08A2-1B4C                          /mnt/usb-archive exfat nofail,rw,uid=1001,gid=1001,umask=0077 0 0",
  ].join("\n") + "\n";

  const backupRows = [
    ["2026-03-15T02:30:11Z", "SUCCESS", "taille=11.2G duree=00:18:31 cible=/backup/local"],
    ["2026-03-16T02:30:08Z", "SUCCESS", "taille=11.3G duree=00:18:10 cible=/backup/local"],
    ["2026-03-17T02:30:19Z", "SUCCESS", "taille=11.3G duree=00:18:41 cible=/backup/local"],
    ["2026-03-18T02:30:03Z", "SUCCESS", "taille=11.3G duree=00:18:04 cible=/backup/local"],
    ["2026-03-19T02:30:15Z", "SUCCESS", "taille=11.4G duree=00:18:22 cible=/backup/local"],
    ["2026-03-20T02:30:14Z", "SUCCESS", "taille=11.4G duree=00:18:15 cible=/backup/local"],
    ["2026-03-21T02:30:17Z", "SUCCESS", "taille=11.5G duree=00:18:18 cible=/backup/local"],
    ["2026-03-22T02:30:28Z", "FAIL", "etat=rsync erreur=permission denied"],
    ["2026-03-23T02:30:16Z", "SUCCESS", "taille=11.5G duree=00:18:26 cible=/backup/local"],
    ["2026-03-24T02:30:09Z", "SUCCESS", "taille=11.5G duree=00:18:09 cible=/backup/local"],
    ["2026-03-25T02:30:12Z", "SUCCESS", "taille=11.6G duree=00:18:12 cible=/backup/local"],
    ["2026-03-26T02:30:21Z", "SUCCESS", "taille=11.6G duree=00:18:33 cible=/backup/local"],
    ["2026-03-27T02:30:22Z", "SUCCESS", "taille=11.6G duree=00:18:21 cible=/backup/local"],
    ["2026-03-28T02:30:12Z", "SUCCESS", "taille=11.7G duree=00:18:42 cible=/backup/local"],
    ["2026-03-29T02:30:24Z", "SUCCESS", "taille=11.7G duree=00:18:39 cible=/backup/local"],
    ["2026-03-30T02:30:19Z", "SUCCESS", "taille=11.7G duree=00:18:19 cible=/backup/local"],
    ["2026-03-31T02:30:11Z", "SUCCESS", "taille=11.8G duree=00:18:27 cible=/backup/local"],
    ["2026-04-01T02:30:15Z", "SUCCESS", "taille=11.8G duree=00:18:29 cible=/backup/local"],
    ["2026-04-02T02:30:14Z", "FAIL", "etat=restic erreur=transport endpoint is not connected"],
    ["2026-04-03T02:30:17Z", "SUCCESS", "taille=11.9G duree=00:18:31 cible=/backup/local"],
    ["2026-04-04T02:30:18Z", "SUCCESS", "taille=11.9G duree=00:18:18 cible=/backup/local"],
    ["2026-04-05T02:30:11Z", "SUCCESS", "taille=11.9G duree=00:18:24 cible=/backup/local"],
    ["2026-04-06T02:30:19Z", "SUCCESS", "taille=12.0G duree=00:18:21 cible=/backup/local"],
    ["2026-04-07T02:30:23Z", "SUCCESS", "taille=12.0G duree=00:18:16 cible=/backup/local"],
    ["2026-04-08T02:30:11Z", "SUCCESS", "taille=12.0G duree=00:18:17 cible=/backup/local"],
    ["2026-04-09T02:30:12Z", "SUCCESS", "taille=12.1G duree=00:18:11 cible=/backup/local"],
    ["2026-04-10T02:30:16Z", "SUCCESS", "taille=12.1G duree=00:18:28 cible=/backup/local"],
    ["2026-04-11T02:30:09Z", "FAIL", "etat=restic erreur=No space left on device"],
    ["2026-04-12T02:30:05Z", "FAIL", "etat=restic erreur=index write failed"],
    ["2026-04-13T02:30:06Z", "FAIL", "etat=restic erreur=repository is not writable"],
  ];
  const backupLogText = backupRows.map((row) => `${row[0]} | ${row[1]} | ${row[2]}`).join("\n") + "\n";

  const snapshotRows = [
    ["f39aa111", "2026-04-10 02:30:20", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa112", "2026-04-09 02:30:16", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa113", "2026-04-08 02:30:16", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa114", "2026-04-07 02:30:09", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa115", "2026-04-06 02:30:33", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa116", "2026-04-05 02:30:15", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa117", "2026-04-04 02:30:16", "srv-fichiers01", "daily", "/srv/partage"],
    ["f39aa118", "2026-04-03 02:30:18", "srv-fichiers01", "daily", "/srv/partage"],
    ["w74bb201", "2026-03-30 02:30:14", "srv-fichiers01", "weekly", "/srv/partage"],
    ["w74bb202", "2026-03-23 02:30:19", "srv-fichiers01", "weekly", "/srv/partage"],
    ["w74bb203", "2026-03-16 02:30:12", "srv-fichiers01", "weekly", "/srv/partage"],
    ["w74bb204", "2026-03-09 02:30:22", "srv-fichiers01", "weekly", "/srv/partage"],
    ["w74bb205", "2026-03-02 02:30:12", "srv-fichiers01", "weekly", "/srv/partage"],
    ["m88cc301", "2026-03-01 02:30:11", "srv-fichiers01", "monthly", "/srv/partage"],
    ["m88cc302", "2026-02-01 02:30:11", "srv-fichiers01", "monthly", "/srv/partage"],
    ["m88cc303", "2026-01-01 02:30:11", "srv-fichiers01", "monthly", "/srv/partage"],
  ];
  const snapshotsText = [
    "ID        Time                 Host             Tags     Paths",
    "-----------------------------------------------------------------------",
    ...snapshotRows.map((row) => `${row[0]}  ${row[1]}  ${row[2]}  ${row[3]}   ${row[4]}`),
    "-----------------------------------------------------------------------",
    "16 snapshots",
  ].join("\n") + "\n";

  const copiesText = [
    "nom | support | emplacement | derniere_sync | statut",
    "production-srv-fichiers01 | disque interne | srv-fichiers01:/srv | 2026-04-13T02:30:06Z | actif",
    "miroir-usb-technique | disque usb chiffre | armoire-technique | 2026-04-10T02:30:16Z | actif",
    "depot-restic-local | disque interne | srv-fichiers01:/backup/local/restic-repo | 2026-04-10T02:30:20Z | actif",
    "copie-restic-hors-site | depot restic distant | srv-sauvegarde01:/var/restic/alize | 2026-03-30T02:30:11Z | echec",
  ].join("\n") + "\n";

  const scriptText = [
    "#!/usr/bin/env bash",
    "set -u",
    "",
    "SOURCE_DIR=\"/srv/partage adhérents\"",
    "MIRROR_DIR=\"/backup/local/partage\"",
    "RESTIC_REPO=\"/backup/local/restic-repo\"",
    "PASSWORD_FILE=\"/root/.config/restic/alize-passphrase\"",
    "LOG_FILE=\"/var/log/backup-alize.log\"",
    "",
    "echo \"[$(date -u +%FT%TZ)] debut sauvegarde\" >> \"$LOG_FILE\"",
    "rsync -a --delete \"$SOURCE_DIR/\" \"$MIRROR_DIR/\"",
    "if [ $? -ne 0 ]; then",
    "  echo \"[$(date -u +%FT%TZ)] miroir en erreur\" >> \"$LOG_FILE\"",
    "fi",
    "restic -r \"$RESTIC_REPO\" --password-file \"$PASSWORD_FILE\" backup $SOURCE_DIR --tag nightly",
    "restic -r \"$RESTIC_REPO\" --password-file \"$PASSWORD_FILE\" forget --keep-last 7 --prune",
  ].join("\n") + "\n";

  const guideText = [
    "# Guide du TP 5 : mises à jour, disques et sauvegardes",
    "",
    "> Cadre et limites",
    ">",
    "> Les sorties et le script fournis sont fictifs.",
    "> Tu interprètes des exports déjà produits sur srv-fichiers01.",
    "> N’exécute jamais un script téléchargé sur une machine importante sans l’avoir lu et adapté à ton propre contexte.",
    "",
    "## Méthode",
    "",
    "1. Dans l’export apt, compte seulement les lignes de paquets. Les mises à jour de sécurité portent le suffixe « -security » dans la provenance.",
    "2. Pour les disques, sépare l’occupation en blocs de l’occupation en inodes. Un disque presque plein et un disque presque à court d’inodes ne racontent pas la même chose.",
    "3. Pour fstab et findmnt, applique la règle du guide : un point de montage temporaire, comme un dossier de travail temporaire, ne devrait pas permettre l’exécution directe.",
    "4. Dans le journal de sauvegarde, seuls les statuts SUCCESS comptent comme nuits réellement réussies.",
    "5. Pour les instantanés, applique exactement la politique donnée dans l’énoncé : dans ce labo, chaque instantané porte une seule étiquette qui dit à quelle règle de conservation il appartient, et tu retiens les plus récents de chaque catégorie sans inventer d’autres règles.",
    "6. Pour le script, cherche d’abord les lignes qui manipulent des chemins avec des espaces ou qui suppriment sans étape de vérification.",
    "",
    "## Visionneuse du site",
    "",
    "- Dans la visionneuse, saisis un mot qui se répète dans le type de ligne que tu cherches, par exemple « security », « fail » ou « backup ».",
    "- Pour vérifier une option de montage ou un tag de rétention, filtre sur un mot général comme « defaults », « nodev », « daily » ou « monthly », puis relis les lignes restantes.",
    "",
    "## Exemples de commandes (données inventées)",
    "",
    "```bash",
    "cat > demo-maj.txt <<'EOF'",
    "openssl/demo-security 3.1 all",
    "openssh-server/demo-updates 9.9 amd64",
    "curl/demo-security 8.8 amd64",
    "EOF",
    "grep -E 'openssh-server|security' demo-maj.txt",
    "",
    "cat > demo-disques.txt <<'EOF'",
    "/dev/vda1 40G 35G 5G 88% /",
    "tmpfs 2.0G 20M 2.0G 1% /work",
    "EOF",
    "grep -E '^/dev|^tmpfs' demo-disques.txt",
    "",
    "cat > demo-fstab.txt <<'EOF'",
    "tmpfs /work tmpfs rw,nosuid,nodev 0 0",
    "EOF",
    "grep -n 'tmpfs' demo-fstab.txt",
    "",
    "cat > demo-backup.log <<'EOF'",
    "2026-06-01T02:00:00Z | SUCCESS | taille=2.0G",
    "2026-06-02T02:00:00Z | FAIL | erreur=repository locked",
    "EOF",
    "grep 'FAIL' demo-backup.log",
    "",
    "cat > demo-snaps.txt <<'EOF'",
    "snap-a daily /data",
    "snap-b weekly /data",
    "snap-c monthly /data",
    "EOF",
    "grep -E 'daily|weekly|monthly' demo-snaps.txt | head -n 2",
    "",
    "cat > demo-script.sh <<'EOF'",
    "#!/usr/bin/env bash",
    "restic backup \"$HOME/demo\"",
    "restic forget --keep-last 3",
    "EOF",
    "grep -nE 'restic|backup' demo-script.sh",
    "```",
    "",
    "## Exemples de commandes PowerShell 5.1 (données inventées)",
    "",
    "```powershell",
    "$demoMaj = @(",
    "  'openssl/demo-security 3.1 all',",
    "  'openssh-server/demo-updates 9.9 amd64',",
    "  'curl/demo-security 8.8 amd64'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-maj.txt\" $demoMaj",
    "Get-Content -Encoding UTF8 \"demo-maj.txt\" | Select-String 'openssh-server|security'",
    "",
    "$demoDisques = @(",
    "  '/dev/vda1 40G 35G 5G 88% /',",
    "  'tmpfs 2.0G 20M 2.0G 1% /work'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-disques.txt\" $demoDisques",
    "Get-Content -Encoding UTF8 \"demo-disques.txt\" | Select-String '^/dev|^tmpfs'",
    "",
    "Set-Content -Encoding UTF8 \"demo-fstab.txt\" 'tmpfs /work tmpfs rw,nosuid,nodev 0 0'",
    "Get-Content -Encoding UTF8 \"demo-fstab.txt\" | Select-String 'tmpfs'",
    "",
    "$demoBackup = @(",
    "  '2026-06-01T02:00:00Z | SUCCESS | taille=2.0G',",
    "  '2026-06-02T02:00:00Z | FAIL | erreur=repository locked'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-backup.log\" $demoBackup",
    "Get-Content -Encoding UTF8 \"demo-backup.log\" | Select-String 'FAIL'",
    "",
    "$demoSnaps = @(",
    "  'snap-a daily /data',",
    "  'snap-b weekly /data',",
    "  'snap-c monthly /data'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-snaps.txt\" $demoSnaps",
    "Get-Content -Encoding UTF8 \"demo-snaps.txt\" | Select-String 'daily|weekly|monthly' | Select-Object -First 2",
    "",
    "$demoScript = @(",
    "  '#!/usr/bin/env bash',",
    "  'restic backup \"$HOME/demo\"',",
    "  'restic forget --keep-last 3'",
    ")",
    "Set-Content -Encoding UTF8 \"demo-script.sh\" $demoScript",
    "Get-Content -Encoding UTF8 \"demo-script.sh\" | Select-String 'restic|backup'",
    "```",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "## Sur un vrai serveur, seulement si tu l’administres vraiment",
    "",
    "```bash",
    "# hors-test",
    "apt list --upgradable",
    "df -h",
    "restic snapshots",
    "```",
    "",
    "## Règles générales à appliquer",
    "",
    "- Politique de rétention pour ce TP : conserver au plus 7 instantanés daily, 4 weekly et 2 monthly.",
    "- Dans la vraie commande « restic forget », un même instantané peut satisfaire plusieurs règles de conservation. Pour cet exercice, nous utilisons une version simplifiée où chaque instantané porte une seule étiquette et compte dans une seule catégorie.",
    "- Règle 3-2-1 : trois copies au total, production comprise, sur au moins deux supports différents, dont une hors site.",
    "- Une copie ne compte que si son statut est actif et si sa dernière synchronisation date de moins de 8 jours à la date d’audit.",
    "- Sur un point de montage temporaire, l’absence de « noexec » reste un signal de risque.",
  ].join("\n") + "\n";

  return {
    files: [
      { name: updatesFile, data: text(updatesText) },
      { name: disksFile, data: text(disksText) },
      { name: fstabFile, data: text(fstabText) },
      { name: backupLogFile, data: text(backupLogText) },
      { name: snapshotsFile, data: text(snapshotsText) },
      { name: copiesFile, data: text(copiesText) },
      { name: scriptFile, data: text(scriptText) },
      { name: guideFile, data: text(guideText) },
    ],
    facts: {
      assetNames: { updatesFile, disksFile, fstabFile, backupLogFile, snapshotsFile, copiesFile, scriptFile, guideFile },
      updateCount: upgradable.length,
      securityCount: upgradable.filter((line) => line.includes("-security")).length,
      opensshVersion: "1:9.6p1-3ubuntu13.12",
      highUsageMount: "/backup/local",
      inodePressureMount: "/var/log",
      noexecRiskMount: "/tmp",
      totalAvailableGiB: 45.7,
      successNights: backupRows.filter((row) => row[1] === "SUCCESS").length,
      longestFailureStreak: 3,
      lastSuccessDate: "2026-04-10",
      lastSuccessAgeDays: dayDiff("2026-04-10", "2026-04-13"),
      retainedSnapshots: 13,
      restoreSnapshotId: "f39aa111",
      badScriptLine: 15,
      threeTwoOneRespected: false,
      missingCopyLetter: "c",
    },
  };
}

function buildTp6() {
  const prng = mulberry32(0x91c4fe27);
  const countScriptFile = "lnx-tp6-compter.sh";
  const cleanScriptFile = "lnx-tp6-nettoyer.sh";
  const inventoryScriptFile = "lnx-tp6-inventaire.sh";
  const backupScriptFile = "lnx-tp6-sauvegarde.sh";
  const logFile = "lnx-tp6-journal.log";
  const csvFile = "lnx-tp6-comptes.csv";
  const candidatesFile = "lnx-tp6-attendus.txt";
  const guideFile = "lnx-tp6-guide.md";

  const failedIps = [
    ["198.51.100.23", 11],
    ["203.0.113.77", 7],
    ["192.0.2.40", 5],
    ["198.51.100.61", 4],
  ];
  const journalLines = [];
  let port = 41000;
  for (const [ip, count] of failedIps) {
    for (let index = 0; index < count; index += 1) {
      const minute = String((index * 3 + ip.length) % 60).padStart(2, "0");
      const second = String((index * 7 + ip.length) % 60).padStart(2, "0");
      const user = index % 2 === 0 ? "adjovi" : "invalid user audit";
      const prefix = user === "invalid user audit" ? `Failed password for invalid user audit` : `Failed password for ${user}`;
      journalLines.push(`Apr 14 06:${minute}:${second} srv-web01 sshd[${2100 + port % 200}]: ${prefix} from ${ip} port ${port} ssh2`);
      port += 17;
    }
  }
  for (let index = 0; index < 180; index += 1) {
    const minute = String((index * 2) % 60).padStart(2, "0");
    const second = String((index * 5) % 60).padStart(2, "0");
    const hour = String(7 + Math.floor(index / 60)).padStart(2, "0");
    const kind = index % 4;
    if (kind === 0) journalLines.push(`Apr 14 ${hour}:${minute}:${second} srv-web01 sshd[${3200 + index}]: Accepted publickey for odiallo from 10.20.0.100 port ${50000 + index} ssh2: ED25519 SHA256:QvWnJx2wIyd3jVnVcp4JfQ8W8x2kTrT2wJd2JrR9dPs`);
    else if (kind === 1) journalLines.push(`Apr 14 ${hour}:${minute}:${second} srv-web01 sudo:  odiallo : TTY=pts/0 ; PWD=/home/odiallo ; USER=root ; COMMAND=/usr/bin/systemctl status nginx`);
    else if (kind === 2) journalLines.push(`Apr 14 ${hour}:${minute}:${second} srv-web01 CRON[${3300 + index}]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)`);
    else journalLines.push(`Apr 14 ${hour}:${minute}:${second} srv-web01 sshd[${3400 + index}]: Connection closed by authenticating user cfall 10.20.0.111 port ${51000 + index} [preauth]`);
  }
  journalLines.sort((left, right) => left.localeCompare(right));

  const csvRows = [
    ["adjovi", "humain", "direction", "/bin/bash", "41"],
    ["straore", "humain", "compta", "/bin/bash", "122"],
    ["odiallo", "humain", "admin", "/bin/bash", "18"],
    ["emballa", "humain", "adherents", "/bin/bash", "94"],
    ["cfall", "humain", "stage", "/bin/bash", "9"],
    ["nkamga", "humain", "prestataire", "/bin/bash", "37"],
    ["svc-backup", "service", "sauvegarde", "/usr/sbin/nologin", "30"],
    ["svc-web", "service", "web", "/bin/bash", "12"],
    ["svc-sync", "service", "sync", "/bin/sh", "102"],
    ["svc-monitor", "service", "supervision", "/usr/sbin/nologin", "215"],
    ["archivage-bot", "service", "archives", "/usr/sbin/nologin", "17"],
    ["pc-direction-local", "local", "poste", "/bin/bash", "360"],
    ["pc-compta-local", "local", "poste", "/bin/bash", "88"],
    ["salle-01", "local", "formation", "/bin/bash", "145"],
    ["salle-02", "local", "formation", "/bin/bash", "70"],
    ["salle-03", "local", "formation", "/bin/bash", "42"],
    ["salle-04", "local", "formation", "/bin/bash", "22"],
    ["test-web", "service", "tests", "/usr/sbin/nologin", "12"],
    ["import-adh", "service", "integration", "/usr/sbin/nologin", "44"],
    ["collecte", "humain", "terrain", "/bin/bash", "64"],
    ["kora", "humain", "formation", "/bin/bash", "51"],
    ["centre", "local", "borne", "/bin/bash", "60"],
    ["save-note", "service", "notes", "/usr/sbin/nologin", "83"],
    ["web-cache", "service", "cache", "/usr/sbin/nologin", "28"],
    ["adm-temp", "local", "depannage", "/bin/bash", "48"],
  ];
  const csvText = ["compte;type;profil;shell;age_jours", ...csvRows.map((row) => row.join(";"))].join("\n") + "\n";

  const countScript = [
    "#!/usr/bin/env bash",
    "# Petit outil de tri des échecs SSH pour la Mutuelle Alizé.",
    "set -u",
    "",
    "usage() {",
    "  echo \"usage: $0 JOURNAL\" >&2",
    "}",
    "",
    "require_file() {",
    "  local file_path=\"$1\"",
    "  [ -f \"$file_path\" ] || return 1",
    "}",
    "",
    "extract_failed_ips() {",
    "  local file_path=\"$1\"",
    "  grep 'Failed password' \"$file_path\" | awk '{print $(NF-3)}'",
    "}",
    "",
    "journal=\"${1:-lnx-tp6-journal.log}\"",
    "if [ \"$#\" -gt 1 ]; then",
    "  usage",
    "  exit 64",
    "fi",
    "if ! require_file \"$journal\"; then",
    "  usage",
    "  exit 64",
    "fi",
    "",
    "total=\"$(grep -c 'Failed password' \"$journal\")\"",
    "echo \"TOTAL_ECHECS=$total\"",
    "",
    "rang=0",
    "while read -r count ip; do",
    "  [ -n \"$ip\" ] || continue",
    "  printf '%s %s\\n' \"$ip\" \"$count\"",
    "  rang=$((rang + 1))",
    "  [ \"$rang\" -ge 3 ] && break",
    "done < <(extract_failed_ips \"$journal\" | sort | uniq -c | sort -nr)",
  ].join("\n") + "\n";

  const cleanScript = [
    "#!/usr/bin/env bash",
    "# Démonstration d’un nettoyage trop large dans un répertoire temporaire.",
    "set -u",
    "",
    "usage() {",
    "  echo \"usage: $0 [DOSSIER]\" >&2",
    "}",
    "",
    "seed_fixture() {",
    "  local target_dir=\"$1\"",
    "  local entry",
    "  mkdir -p \"$target_dir\"",
    "  for entry in \"ancien-un.log|202603010101\" \"ancien deux.log|202603020101\" \"ancien-trois.txt|202603050101\" \"recent.txt|202604140101\"; do",
    "    local file_name=\"${entry%%|*}\"",
    "    local stamp=\"${entry##*|}\"",
    "    touch -t \"$stamp\" \"$target_dir/$file_name\"",
    "  done",
    "}",
    "",
    "report_remaining() {",
    "  local target_dir=\"$1\"",
    "  find \"$target_dir\" -maxdepth 1 -type f | wc -l | tr -d ' '",
    "}",
    "",
    "cleanup_dir=\"${1:-a supprimer}\"",
    "if [ \"$#\" -gt 1 ]; then",
    "  usage",
    "  exit 64",
    "fi",
    "workdir=\"$(mktemp -d \"${TMPDIR:-/tmp}/alize-clean.XXXXXX\")\"",
    "trap 'rm -rf \"$workdir\"' EXIT",
    "cd \"$workdir\" || exit 70",
    "seed_fixture \"$cleanup_dir\"",
    "",
    "old_count=\"$(find \"$cleanup_dir\" -maxdepth 1 -type f ! -newermt '2026-03-15 00:00:00 UTC' | wc -l | tr -d ' ')\"",
    "echo \"ANCIENS=$old_count\"",
    "rm -f $cleanup_dir/*",
    "remaining=\"$(report_remaining \"$cleanup_dir\")\"",
    "echo \"RESTANTS=$remaining\"",
  ].join("\n") + "\n";

  const inventoryScript = [
    "#!/usr/bin/env bash",
    "# Contrôle rapide des comptes qui méritent une revue.",
    "set -u",
    "",
    "usage() {",
    "  echo \"usage: $0 CSV [PREFIXE]\" >&2",
    "}",
    "",
    "check_file() {",
    "  local csv_path=\"$1\"",
    "  [ -f \"$csv_path\" ] || return 1",
    "}",
    "",
    "csv=\"${1:-lnx-tp6-comptes.csv}\"",
    "prefix=\"${2:-}\"",
    "if [ \"$#\" -gt 2 ]; then",
    "  usage",
    "  exit 64",
    "fi",
    "if ! check_file \"$csv\"; then",
    "  usage",
    "  exit 64",
    "fi",
    "",
    "awk -F';' -v prefix=\"$prefix\" '",
    "NR == 1 { next }",
    "(prefix == \"\" || $1 ~ \"^\" prefix) {",
    "  service_shell = ($2 == \"service\" && $4 != \"/usr/sbin/nologin\")",
    "  password_old = ($5 + 0 > 90)",
    "  if (service_shell || password_old) {",
    "    print $1 \";\" $2 \";\" $4 \";\" $5",
    "    count += 1",
    "  }",
    "}",
    "END { print \"TOTAL=\" count + 0 }' \"$csv\"",
  ].join("\n") + "\n";

  const backupScript = [
    "#!/usr/bin/env bash",
    "# Construction d’une commande d’archivage à relire avant exécution.",
    "set -u",
    "",
    "usage() {",
    "  echo \"usage: $0 [LABEL]\" >&2",
    "}",
    "",
    "build_command() {",
    "  local current_label=\"$1\"",
    "  printf \"printf 'archive=%%s\\\\n' %s\" \"$current_label\"",
    "}",
    "",
    "label=\"${1:-rapport-avril}\"",
    "if [ \"$#\" -gt 1 ]; then",
    "  usage",
    "  exit 64",
    "fi",
    "",
    "commande=\"$(build_command \"$label\")\"",
    "echo \"COMMANDE=$commande\"",
    "",
    "# La commande construite ci-dessus est ensuite exécutée telle quelle.",
    "eval \"$commande\"",
  ].join("\n") + "\n";

  const candidateBlocks = [
    ["TOTAL_ECHECS=28", "198.51.100.23 11", "203.0.113.77 7", "192.0.2.40 5"],
    ["TOTAL_ECHECS=27", "203.0.113.77 7", "198.51.100.23 11", "192.0.2.40 5"],
    ["TOTAL_ECHECS=27", "198.51.100.23 11", "203.0.113.77 7", "192.0.2.40 5"],
    ["TOTAL_ECHECS=27", "198.51.100.23 11", "203.0.113.77 6", "192.0.2.40 5"],
    ["TOTAL_ECHECS=27", "198.51.100.23 11", "192.0.2.40 5", "203.0.113.77 7"],
  ];
  const candidateOrder = [0, 1, 2, 3, 4];
  for (let index = candidateOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(prng() * (index + 1));
    [candidateOrder[index], candidateOrder[swapIndex]] = [candidateOrder[swapIndex], candidateOrder[index]];
  }
  const candidatesText = candidateOrder.map((blockIndex, index) => `Bloc ${index + 1}\n${candidateBlocks[blockIndex].join("\n")}`).join("\n\n") + "\n";
  const countCandidateBlock = candidateOrder.findIndex((blockIndex) => blockIndex === 2) + 1;

  const guideText = [
    "# Guide du TP 6 : lire, tester et corriger des scripts shell",
    "",
    "> Cadre et limites",
    ">",
    "> Les quatre scripts et les deux jeux de données sont fictifs.",
    "> Tu testes uniquement les fichiers du labo, dans un répertoire temporaire ou dans la visionneuse.",
    "> Ne lance jamais un script téléchargé sur un système important sans l’avoir lu, compris et isolé.",
    "",
    "## Méthode",
    "",
    "1. Lis chaque script du haut vers le bas avant de l’exécuter. Repère les variables d’entrée, les fonctions, les boucles et les commandes de suppression.",
    "2. Vérifie d’abord la syntaxe avec « bash -n », puis l’exécution réelle avec les données du labo.",
    "3. Quand un chemin peut contenir des espaces, toute variable de chemin doit être protégée par des guillemets.",
    "4. Une ligne du type « eval » ou une commande reconstruite depuis l’entrée demande une validation stricte de l’argument.",
    "5. Pour raisonner sur un script dangereux, regarde aussi ce qui se passerait si une variable devenait vide ou inattendue.",
    "",
    "## Visionneuse du site",
    "",
    "- Dans la visionneuse, filtre avec des mots généraux vus dans les leçons, comme « usage », « total », « error » ou « failed », puis relis les lignes restantes.",
    "- Pour un script, filtre d’abord sur un mot de structure comme « function », « while », « eval » ou « rm » avant de relire les quelques lignes affichées.",
    "",
    "## Exemples de commandes (données inventées)",
    "",
    "```bash",
    "cat > demo-check.sh <<'EOF'",
    "#!/usr/bin/env bash",
    "name=\"${1:-demo}\"",
    "printf 'bonjour %s\\n' \"$name\"",
    "EOF",
    "bash -n demo-check.sh && echo 'syntaxe-ok'",
    "bash -x demo-check.sh alize 2>&1 | head -n 4",
    "",
    "cat > demo-inventaire.sh <<'EOF'",
    "#!/usr/bin/env bash",
    "awk -F';' 'NR>1 {print $1 \";\" $2}' demo-comptes.csv",
    "EOF",
    "cat > demo-comptes.csv <<'EOF'",
    "compte;type",
    "poste-a;local",
    "svc-demo;service",
    "EOF",
    "grep -nE 'awk -F|print' demo-inventaire.sh",
    "```",
    "",
    "## Exemples de commandes PowerShell 5.1 (données inventées)",
    "",
    "```powershell",
    "$demoScript = @(",
    "  '#!/usr/bin/env bash',",
    "  'name=\"${1:-demo}\"',",
    "  'printf ''bonjour %s\\n'' \"$name\"'",
    ")",
    "Set-Content -Encoding Ascii \"demo-check.sh\" $demoScript",
    "& \"C:\\Program Files\\Git\\bin\\bash.exe\" -n \"demo-check.sh\"; Write-Output 'syntaxe-ok'",
    "Set-Content -Encoding Ascii \"demo-run.sh\" 'bash -x demo-check.sh alize 2>&1 | head -n 4'",
    "& \"C:\\Program Files\\Git\\bin\\bash.exe\" \"demo-run.sh\"",
    "",
    "$demoInventory = @(",
    "  '#!/usr/bin/env bash',",
    "  'awk -F'';'' ''NR>1 {print $1 \";\" $2}'' demo-comptes.csv'",
    ")",
    "$demoCsv = @(",
    "  'compte;type',",
    "  'poste-a;local',",
    "  'svc-demo;service'",
    ")",
    "Set-Content -Encoding Ascii \"demo-inventaire.sh\" $demoInventory",
    "Set-Content -Encoding Ascii \"demo-comptes.csv\" $demoCsv",
    "Get-Content -Encoding UTF8 \"demo-inventaire.sh\" | Select-String 'awk -F|print'",
    "```",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "## Rappels utiles",
    "",
    "- Un défaut de variable non protégée dans un chemin peut être détecté automatiquement par ShellCheck.",
    "- La leçon sur les scripts fiables présente l’option de « set » qui arrête l’exécution dès la première commande en échec.",
    "- Avant toute suppression large, il faut vérifier que le chemin n’est ni vide, ni inattendu, ni hors du dossier prévu, et que le motif cible seulement les fichiers voulus.",
  ].join("\n") + "\n";

  return {
    files: [
      { name: countScriptFile, data: text(countScript) },
      { name: cleanScriptFile, data: text(cleanScript) },
      { name: inventoryScriptFile, data: text(inventoryScript) },
      { name: backupScriptFile, data: text(backupScript) },
      { name: logFile, data: text(journalLines.join("\n") + "\n") },
      { name: csvFile, data: text(csvText) },
      { name: candidatesFile, data: text(candidatesText) },
      { name: guideFile, data: text(guideText) },
    ],
    facts: {
      assetNames: { countScriptFile, cleanScriptFile, inventoryScriptFile, backupScriptFile, logFile, csvFile, candidatesFile, guideFile },
      countCandidateBlock,
      countFailedLines: 27,
      countTopIp: "198.51.100.23",
      countOutputLines: 4,
      countExitCode: 0,
      cleanOldFiles: 3,
      cleanUnquotedLine: cleanScript.split("\n").findIndex((line) => line.includes("rm -f $cleanup_dir/*")) + 1,
      emptyVarLetter: "a",
      cleanRemainingFiles: 4,
      inventoryFlagged: 7,
      inventorySvcOutputLines: 4,
      backupEvalLine: backupScript.split("\n").findIndex((line) => line.startsWith("eval ")) + 1,
      shellcheckCode: "sc2086",
      fixLetter: "b",
      errexitAnswer: "set -e",
      cleanNonOldFile: "recent.txt",
    },
  };
}

function buildLinuxAssetsB() {
  const reseau = buildTp4();
  const maintenance = buildTp5();
  const scripts = buildTp6();
  return {
    files: [...reseau.files, ...maintenance.files, ...scripts.files],
    facts: {
      reseau: reseau.facts,
      maintenance: maintenance.facts,
      scripts: scripts.facts,
    },
  };
}

module.exports = { buildLinuxAssetsB, compact, yesNo, dayDiff, text, tsv, path };
