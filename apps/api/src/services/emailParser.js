function getDate(content) {
  const match = content.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (!match) return null;
  const [day, month, year] = match[1].split("/");
  return `${year}-${month}-${day}`;
}

function extractProcessNumber(content) {
  const processRegex = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
  return content.match(processRegex)?.[1] || null;
}

function inferType(subject, content) {
  const text = `${subject} ${content}`.toLowerCase();
  if (text.includes("intima")) return "intimacao";
  if (text.includes("audiência") || text.includes("audiencia")) return "audiencia";
  if (text.includes("prazo")) return "prazo";
  return "pendente";
}

function parseTribunalEmail({ subject = "", body = "" }) {
  const processNumber = extractProcessNumber(body) || extractProcessNumber(subject);
  const type = inferType(subject, body);
  const deadlineDate = getDate(body);

  const missingFields = [];
  if (!processNumber) missingFields.push("numero_processo");
  if (!deadlineDate) missingFields.push("data");

  return {
    processNumber,
    type,
    deadlineDate,
    description: body.slice(0, 1000),
    reviewStatus: missingFields.length ? "pendente_revisao" : "parse_ok",
    missingFields
  };
}

module.exports = { parseTribunalEmail };
