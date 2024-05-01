import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import '@ungap/with-resolvers';
import 'dotenv/config';
import fs from "fs";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { getDocument } from "pdfjs-dist";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const testItem = z
  .object({
    testName: z.string().describe("name of the test mentioned in the input"),
    result: z.string().describe("result of the test mentioned in the input"),
    unit: z.string().describe("unit of the result mentioned in the input"),
    method: z.optional(z.string()).describe("method of the test mentioned in the input"),
    intervals: z.optional(z.array(z.string())).describe("biomarker reference intervals mentioned in the input"),
  })

const schema =
  z.object({
    markers: z.array(testItem).describe("list of test results extracted from the input"),
  }).describe("A tool to extract medical lab test report information from a pdf's contents");

const prompt = new ChatPromptTemplate({
  promptMessages: [
    SystemMessagePromptTemplate.fromTemplate(
      "Extract information from the following pdf content as best as possible"
    ),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ],
  inputVariables: ["input"],
});

const llm = new ChatOpenAI({ modelName: "gpt-3.5-turbo-0613", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });

const getPdfText = async (
  src
) => {
  const pdf = await getDocument(src).promise;

  const pageList = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1))
  );

  const textList = await Promise.all(pageList.map((p) => p.getTextContent()));

  return textList
    .map(({ items }) =>
      items
        .map((item) => item?.str ?? null)
        .filter((str) => str)
    )
};

const buffer = fs.readFileSync("./data/test-4.pdf");
const typedArray = new Uint8Array(buffer);
const pdfContent = await getPdfText(typedArray);

const functionCallingModel = llm.bind({
  functions: [
    {
      name: "output_formatter",
      description: "Should always be used to properly format output",
      parameters: zodToJsonSchema(schema),
    },
  ],
  function_call: { name: "output_formatter" },
});

const outputParser = new JsonOutputFunctionsParser();

const chain = prompt.pipe(functionCallingModel).pipe(outputParser);

const response = await chain.invoke({
  input: pdfContent
});

console.log(JSON.stringify(response, null, 2));
