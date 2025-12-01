# dienstplan

Webbasierte Oberfläche, damit Admins Zugänge verwalten und Assistent:innen ihre Dienst- und Urlaubswünsche selbst pflegen können.

## Quickstart

1. Öffne `index.html` im Browser.
2. Admin-Login (Demo): Passwort `admin123`.
3. Assistenz-Login (Demo): Auswahl "Anna Becker" PIN `1234` oder "Cem Kaya" PIN `5678`.

## Funktionsumfang

- Zwei Rollen: Admin und Assistenz mit getrennten Anmeldebereichen.
- Admins können Assistent:innen anlegen (Name, PIN, Farbcode) und sehen belegte Tage der nächsten 60 Tage.
- Assistent:innen wählen einen Monat und tragen Dienstwünsche (Früh-, Spät-, Nacht-, Visitendienst sowie Urlaub/Frei) ein.
- Voreinstellung: Mo–Fr Frühdienst, Wochenende Frühdienst (anpassbar pro Tag im Planer).
- Alle Daten werden im Browser (LocalStorage) gehalten – ideal für Prototyping und Demo.
