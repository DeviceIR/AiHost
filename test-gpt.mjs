import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "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",
});

const response = openai.responses.create({
  model: "gpt-5-nano",
  input: "write a haiku about ai",
  store: true,
});

response.then((result) => console.log(result.output_text));
