export type ApiErrorCode = "CONFLICT" | "VALIDATION" | "FORBIDDEN" | "NOT_FOUND"

export class ApiError extends Error {
  code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "ApiError"
  }
}
