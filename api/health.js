module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5-mini"
  });
};
