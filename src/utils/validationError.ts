export const schemaValidationError = (error: any, message: string) => ({
  message,
  fields: error.issues.map((issue: any) => ({
    name: String(issue.path[0]),
    message: issue.message,
  })),
});
