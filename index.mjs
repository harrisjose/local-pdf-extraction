import { getDocument } from "pdfjs-dist";
import fs from "fs";
import '@ungap/with-resolvers';

export const getPdfText = async (
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

const buffer = fs.readFileSync("./data/test-2.pdf");
const typedArray = new Uint8Array(buffer);
const text = await getPdfText(typedArray);
console.log(text);
