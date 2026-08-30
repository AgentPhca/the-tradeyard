import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Impressum – The Tradeyard",
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2 className="mb-2 font-semibold text-text">Angaben gemäß § 5 TMG</h2>
        <p>
          Phil Cambefort
          <br />
          Aachenerstraße 707
          <br />
          50259 Frechen
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">Kontakt</h2>
        <p>E-Mail: theTradeyard@phca.tech</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p>Phil Cambefort (Anschrift wie oben)</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">Art des Angebots</h2>
        <p>
          The Tradeyard ist ein privates, nicht-kommerzielles Hobbyprojekt für Sammler von
          NFL-Trading-Cards. Es werden keine Waren oder Dienstleistungen verkauft, keine Preise
          angezeigt und kein Gewerbe betrieben. Die Plattform dient ausschließlich dazu,
          Sammlungen zu verwalten und Sammler zum Zweck des Tauschs miteinander in Kontakt zu
          bringen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
          bereit: {" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben unter Kontakt. Da es sich um ein privates,
          nicht-gewerbliches Projekt handelt, sind wir nicht verpflichtet und nicht bereit, an
          einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
          rechtswidrige Tätigkeit hinweisen. Von Nutzern eingestellte Inhalte (z. B. Karten,
          Nachrichten, Profildaten, Wunschlisten) geben nicht zwingend unsere Meinung wieder.
          Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend
          entfernen.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-text">Haftung für Links</h2>
        <p>
          Diese Website enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir
          keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
          Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
          Anbieter oder Betreiber der Seiten verantwortlich.
        </p>
      </section>
    </LegalLayout>
  );
}
