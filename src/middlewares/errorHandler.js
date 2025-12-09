// errorHandler.js
export function errorHandler(err, req, res, next) {
  // logging


  // fallback status & message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // send unified response
  res.status(statusCode).json({
    success: false,
    message,
  });
}
