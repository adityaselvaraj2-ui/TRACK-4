import { Type, type FunctionDeclaration } from "@google/genai";

const pathSchema = {
  type: Type.STRING,
  description: "File path relative to project root, e.g. 'index.html'",
};

const contentSchema = {
  type: Type.STRING,
  description: "Full file contents",
};

export const writeFileDeclaration: FunctionDeclaration = {
  name: "write_file",
  description:
    "Create or overwrite a file in the project's virtual filesystem. Use for all HTML/CSS/JS content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: pathSchema,
      content: contentSchema,
    },
    required: ["path", "content"],
  },
};

export const updateFileDeclaration: FunctionDeclaration = {
  name: "update_file",
  description:
    "Update an existing file's content. Fails if the file does not exist — use write_file to create new files.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: pathSchema,
      content: contentSchema,
    },
    required: ["path", "content"],
  },
};

export const deleteFileDeclaration: FunctionDeclaration = {
  name: "delete_file",
  description: "Delete a file from the project.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: pathSchema,
    },
    required: ["path"],
  },
};

export const fileToolDeclarations: FunctionDeclaration[] = [
  writeFileDeclaration,
  updateFileDeclaration,
  deleteFileDeclaration,
];

export type FileToolName = "write_file" | "update_file" | "delete_file";

export interface FileToolArgs {
  path: string;
  content?: string;
}
