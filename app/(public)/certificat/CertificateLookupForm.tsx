export default function CertificateLookupForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form className="public-form cert-lookup" action="/certificat" method="get" role="search">
      <label>
        Code de vérification
        <input
          name="code"
          defaultValue={defaultValue}
          required
          minLength={16}
          maxLength={24}
          inputMode="text"
          pattern="[A-Za-z0-9\\s-]{16,24}"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD EFGH JKLM NPQR"
          aria-describedby="cert-lookup-help"
        />
      </label>
      <button className="public-button button-primary" type="submit">Vérifier</button>
      <p id="cert-lookup-help">16 caractères, imprimés en bas du certificat. Les espaces et tirets sont ignorés.</p>
    </form>
  );
}
