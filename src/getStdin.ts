export const getStdin = async (isTTY: boolean, stream: () => ReadableStream<Uint8Array>): Promise<string> => {
  if (!isTTY) {
    let text = "";
    for await (const chunk of stream()) {
      const chunkText = Buffer.from(chunk).toString();
      text = `${text}${chunkText}`;
    }
    return text;
  }

  return "";
};
