import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – The Tradeyard",
};

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section>
        <h2 className="mb-2 font-semibold text-text">1. Verantwortlicher</h2>
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          <br />
          <br />
          Phil Cambefort
          <br />
          Aachenerstraße 707
          <br />
          50259 Frechen
          <br />
          Deutschland
          <br />
          E-Mail: theTradeyard@phca.tech
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">2. Allgemeines</h2>
        <p>
          The Tradeyard ist ein privates, nicht-kommerzielles Hobbyprojekt für Sammler von
          NFL-Trading-Cards. Der Schutz Ihrer personenbezogenen Daten ist uns trotzdem wichtig.
          Diese Erklärung informiert Sie darüber, welche Daten bei der Nutzung von The Tradeyard
          verarbeitet werden, zu welchem Zweck dies geschieht und welche Rechte Ihnen zustehen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">3. Welche Daten wir verarbeiten</h2>
        <p>Bei der Nutzung von The Tradeyard verarbeiten wir insbesondere folgende Daten:</p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>
            <strong>Account-Daten:</strong> E-Mail-Adresse, Nutzername, gewähltes Passwort
            (verschlüsselt gespeichert), optional vollständiger Name, Profilbild, Biografie,
            Rolle (Collector/Retailer/Streamer) und Links zu Twitch/Whatnot/eigener Website.
          </li>
          <li>
            <strong>Nutzungsinhalte:</strong> von Ihnen eingetragene Kartendaten (Spieler, Team,
            Set, Zustand, Fotos), Einträge in Ihrer Wunschliste sowie Nachrichten, die Sie über
            die integrierte Chat-Funktion an andere Nutzer senden.
          </li>
          <li>
            <strong>Beziehungsdaten:</strong> wem Sie folgen bzw. wer Ihnen folgt, welche Karten
            Sie gespeichert haben, sowie Bewertungen im Zusammenhang mit abgeschlossenen
            Tauschgeschäften.
          </li>
          <li>
            <strong>Technische Daten:</strong> Session-Cookies zur Anmeldung (siehe Ziffer 6)
            sowie technisch notwendige Server-Logdaten unserer Hosting- und
            Infrastrukturanbieter.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">4. Zwecke und Rechtsgrundlagen</h2>
        <p>
          Wir verarbeiten diese Daten, um Ihnen die Registrierung, die Verwaltung Ihrer
          Sammlung, die Nutzung des Marktplatzes sowie die Kontaktaufnahme mit anderen Nutzern
          zu ermöglichen. Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung
          eines Nutzungsverhältnisses, das Sie durch Ihre Registrierung mit uns eingehen).
          Soweit wir Daten zur Absicherung und zum reibungslosen Betrieb der Plattform
          verarbeiten, stützen wir uns auf Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
          einem funktionsfähigen und sicheren Angebot).
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">
          5. Hosting und eingesetzte Dienstleister
        </h2>
        <p>
          The Tradeyard wird technisch mit Hilfe von Drittanbietern betrieben, die als
          Auftragsverarbeiter bzw. eigenständig Verantwortliche für uns tätig werden:
        </p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>
            <strong>Supabase</strong> (Supabase Inc.) für Benutzerkonten/Authentifizierung,
            Datenbank und Datei-Speicher (z. B. Karten- und Profilbilder).
          </li>
          <li>
            <strong>Vercel</strong> (Vercel Inc.) für das Hosting der Website/Anwendung.
          </li>
        </ul>
        <p className="mt-2">
          Beide Anbieter können Daten auch außerhalb der EU/des EWR verarbeiten. Soweit dies der
          Fall ist, erfolgt dies auf Grundlage von EU-Standardvertragsklauseln bzw. eines
          Angemessenheitsbeschlusses der EU-Kommission. Eine aktuelle Übersicht der von uns
          konkret genutzten Rechenzentrumsregionen können Sie über die oben genannte
          Kontakt-E-Mail-Adresse erfragen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">6. Cookies</h2>
        <p>
          Wir setzen ausschließlich technisch notwendige Cookies ein, die für die Anmeldung und
          Aufrechterhaltung Ihrer Sitzung (Login-Session) erforderlich sind. Diese werden von
          unserem Authentifizierungsdienst (Supabase) gesetzt. Wir verwenden keine Cookies zu
          Marketing-, Tracking- oder Analysezwecken.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">7. Weitergabe an andere Nutzer</h2>
        <p>
          Ihr Nutzername, Profilbild, Ihre Rolle, Biografie sowie als &bdquo;zum Tausch&ldquo;
          markierte Karten und Wunschlisten-Einträge sind für andere angemeldete Nutzer der
          Plattform sichtbar, da dies dem Zweck der Anwendung entspricht. Nachrichten sind nur
          für die jeweiligen Gesprächspartner einsehbar. Sie können in den
          Privatsphäre-Einstellungen Ihres Profils festlegen, ob andere Nutzer Sie kontaktieren
          dürfen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">8. Speicherdauer</h2>
        <p>
          Wir speichern Ihre Daten, solange Ihr Nutzerkonto besteht. Auf Wunsch löschen wir Ihr
          Konto und die damit verbundenen personenbezogenen Daten; gesetzliche
          Aufbewahrungspflichten bleiben hiervon unberührt.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">9. Ihre Rechte</h2>
        <p>Ihnen stehen als betroffener Person insbesondere folgende Rechte zu:</p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          <li>
            Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO)
          </li>
        </ul>
        <p className="mt-2">
          Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannte
          E-Mail-Adresse.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">10. Kontakt</h2>
        <p>
          Bei Fragen zum Datenschutz erreichen Sie uns unter:{" "}
          <a href="mailto:theTradeyard@phca.tech" className="text-primary hover:underline">
            theTradeyard@phca.tech
          </a>
        </p>
      </section>

      <p className="mt-4 text-xs text-muted">
        Stand: {new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" })}
      </p>
    </LegalLayout>
  );
}
