import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "AGB / Nutzungsbedingungen – The Tradeyard",
};

export default function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen / Nutzungsbedingungen">
      <section>
        <h2 className="mb-2 font-semibold text-text">1. Geltungsbereich und Anbieter</h2>
        <p>
          Diese Nutzungsbedingungen regeln die Nutzung von The Tradeyard, einem privaten,
          nicht-kommerziellen Hobbyprojekt für Sammler von NFL-Trading-Cards, betrieben von:
          <br />
          <br />
          Phil Cambefort (Kontakt: theTradeyard@phca.tech)
          <br />
          <br />
          The Tradeyard betreibt kein Gewerbe. Über die Plattform werden weder Waren noch
          Dienstleistungen verkauft, es werden keine Preise angezeigt und es findet kein
          Zahlungsverkehr über die Plattform statt. The Tradeyard dient ausschließlich dazu,
          Sammlungen zu verwalten und Sammler zum Zweck des Tauschs untereinander in Kontakt zu
          bringen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">2. Registrierung</h2>
        <p>
          Zur Nutzung der Kernfunktionen (eigene Sammlung, Marktplatz, Wunschliste,
          Nachrichten) ist ein Nutzerkonto erforderlich. Sie sind verpflichtet, bei der
          Registrierung wahrheitsgemäße Angaben zu machen und Ihre Zugangsdaten geheim zu
          halten. Ein Anspruch auf Registrierung besteht nicht.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">3. Inhalte der Nutzer</h2>
        <p>
          Für Inhalte, die Sie auf The Tradeyard einstellen (z. B. Karteneinträge, Fotos,
          Profilangaben, Wunschlisten-Einträge, Nachrichten), sind Sie selbst verantwortlich.
          Sie versichern, dass Sie zur Veröffentlichung dieser Inhalte berechtigt sind und
          keine Rechte Dritter verletzen. Unzulässig sind insbesondere rechtswidrige,
          irreführende, beleidigende oder die Rechte Dritter verletzende Inhalte. Wir behalten
          uns vor, entsprechende Inhalte zu entfernen und Nutzerkonten bei Verstößen zu sperren
          oder zu löschen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">
          4. Keine Vermittlung, keine Garantie für Tauschgeschäfte
        </h2>
        <p>
          The Tradeyard stellt lediglich die technische Infrastruktur bereit, über die Nutzer
          miteinander in Kontakt treten können. Etwaige Tauschgeschäfte kommen ausschließlich
          zwischen den beteiligten Nutzern zustande und werden von diesen eigenverantwortlich
          außerhalb der Plattform abgewickelt. Wir prüfen weder die Identität der Nutzer noch
          die Echtheit, den Zustand oder den Wert der abgebildeten Karten und übernehmen keine
          Garantie oder Vermittlerrolle für das Zustandekommen oder die Abwicklung von
          Tauschgeschäften. Die Kontaktaufnahme und jeder Tausch erfolgen auf eigenes Risiko der
          beteiligten Nutzer.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">5. Verfügbarkeit und Haftung</h2>
        <p>
          Da es sich um ein unentgeltliches, privates Hobbyprojekt handelt, besteht kein
          Anspruch auf ständige Verfügbarkeit, Fehlerfreiheit oder einen bestimmten
          Funktionsumfang der Plattform. Für Schäden haften wir nur bei Vorsatz oder grober
          Fahrlässigkeit sowie bei der schuldhaften Verletzung wesentlicher Vertragspflichten
          (Kardinalpflichten), letzteres begrenzt auf den vorhersehbaren, vertragstypischen
          Schaden. Die Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der
          Gesundheit bleibt hiervon unberührt.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">6. Kündigung und Sperrung</h2>
        <p>
          Sie können Ihr Nutzerkonto jederzeit ohne Angabe von Gründen löschen lassen; wenden
          Sie sich hierzu an die oben genannte Kontakt-E-Mail-Adresse. Wir behalten uns vor,
          Nutzerkonten bei einem Verstoß gegen diese Nutzungsbedingungen zu sperren oder zu
          löschen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">7. Änderungen dieser Bedingungen</h2>
        <p>
          Wir können diese Nutzungsbedingungen ändern, um sie an eine geänderte Funktionsweise
          der Plattform oder an rechtliche Vorgaben anzupassen. Die jeweils aktuelle Fassung
          ist stets auf dieser Seite abrufbar.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">8. Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht. Zwingende verbraucherschützende Bestimmungen des Staates, in
          dem Sie Ihren gewöhnlichen Aufenthalt haben, bleiben hiervon unberührt. Sollte eine
          Bestimmung dieser Nutzungsbedingungen unwirksam sein, bleibt die Wirksamkeit der
          übrigen Bestimmungen hiervon unberührt.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">9. Kontakt</h2>
        <p>
          Fragen zu diesen Nutzungsbedingungen richten Sie bitte an:{" "}
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
