'use strict'

// 2xx Success
export const OK = 200
export const CREATED = 201
export const ACCEPTED = 202
export const NO_CONTENT = 204
export const PARTIAL_CONTENT = 206
// 3xx Redirection
export const MULTIPLE_CHOICES = 300
export const MOVED_PERMANENTLY = 301
export const FOUND = 302
export const SEE_OTHER = 303
export const NOT_MODIFIED = 304
export const TEMPORARY_REDIRECT = 307
export const PERMANENT_REDIRECT = 308
// 4xx Client error
export const BAD_REQUEST = 400
export const UNAUTHORIZED = 401
export const PAYMENT_REQUIRED = 402
export const FORBIDDEN = 403
export const NOT_FOUND = 404
export const METHOD_NOT_ALLOWED = 405
export const NOT_ACCEPTABLE = 406
export const PROXY_AUTHENTICATION_REQUIRED = 407
export const REQUEST_TIMEOUT = 408
export const CONFLICT = 409
export const GONE = 410
export const LENGTH_REQUIRED = 411
export const PRECONDITION_FAILED = 412
export const PAYLOAD_TOO_LARGE = 413
export const URI_TOO_LONG = 414
export const UNSUPPORTED_MEDIA_TYPE = 415
export const RANGE_NOT_SATISFIABLE = 416
export const EXPECTATION_FAILED = 417
export const IM_A_TEAPOT = 418
export const MISDIRECTED_REQUEST = 421
export const UNPROCESSABLE_ENTITY = 422
export const LOCKED = 423
export const FAILED_DEPENDENCY = 424
export const TOO_EARLY = 425
export const UPGRADE_REQUIRED = 426
export const PRECONDITION_REQUIRED = 428
export const TOO_MANY_REQUESTS = 429
export const REQUEST_HEADER_FIELDS_TOO_LARGE = 431
export const UNAVAILABLE_FOR_LEGAL_REASONS = 451
// 5xx Server error
export const INTERNAL_SERVER_ERROR = 500
export const NOT_IMPLEMENTED = 501
export const BAD_GATEWAY = 502
export const SERVICE_UNAVAILABLE = 503
export const GATEWAY_TIMEOUT = 504
export const HTTP_VERSION_NOT_SUPPORTED = 505
export const VARIANT_ALSO_NEGOTIATES = 506
export const INSUFFICIENT_STORAGE = 507
export const LOOP_DETECTED = 508
export const NOT_EXTENDED = 510
export const NETWORK_AUTHENTICATION_REQUIRED = 511
