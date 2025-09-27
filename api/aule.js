import fetch from "node-fetch";

function minuti(orario) {
  const [h, m] = orario.split(":").map(Number);
  return h * 60 + m;
}

export default async function handler(req, res) {
  const { data, from_time, to_time } = req.query;

  if (!data || !from_time || !to_time) {
    return res.status(400).json({ error: "Parametri mancanti" });
  }

  try {
    const inizioMin = minuti(from_time);
    const fineMin = minuti(to_time);

    if (inizioMin >= fineMin) {
      return res.status(400).json({ error: "Orari non validi" });
    }

    const url = "https://easyacademy.unina.it/agendastudenti/rooms_call.php";
    const payload = new URLSearchParams({
      "form-type": "rooms",
      "view": "rooms",
      "include": "rooms",
      "aula": "",
      "sede": "3",
      "date": data,
      "_lang": "it",
      "list": "",
      "week_grid_type": "-1",
      "ar_codes_": "",
      "ar_select_": "",
      "col_cells": "0",
      "empty_box": "0",
      "only_grid": "0",
      "highlighted_date": "0",
      "all_events": "0"
    });

    const response = await fetch(url, {
      method: "POST",
      body: payload,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://easyacademy.unina.it/agendastudenti/index.php"
      },
      timeout: 15000
    });

    if (!response.ok) {
      return res.status(500).json({ error: `Errore API: ${response.status}` });
    }

    const dataJson = await response.json();
    const lezioni = dataJson.events || dataJson;

    const tutteAule = new Set();
    const auleOccupate = new Set();

    lezioni.forEach(lezione => {
      if (typeof lezione !== "object") return;
      const start = lezione.from;
      const end = lezione.to;
      const aula = lezione.NomeAula;
      if (!start || !end || !aula) return;

      tutteAule.add(aula);
      if (!(fineMin <= minuti(start) || inizioMin >= minuti(end))) {
        auleOccupate.add(aula);
      }
    });

    const libere = Array.from(tutteAule).filter(a => !auleOccupate.has(a));
    return res.status(200).json({ libere });
  } catch (err) {
    console.error("Errore API:", err);
    return res.status(500).json({ error: "Errore interno", details: err.message });
  }
}
