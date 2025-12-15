// // errorHandler.js
// export function errorHandler(err, req, res, next) {
//   // logging


//   // fallback status & message
//   const statusCode = err.statusCode || 500;
//   const message = err.message || "Internal server error";

//   // send unified response
//   res.status(statusCode).json({
//     success: false,
//     message,
//   });
// }




// // Example of a robust error handler middleware in Express

// export const errorHandler = (err, req, res, next) => {
//     let error = { ...err };
//     error.message = err.message;
    
//     // Default status code and message for unhandled errors
//     let statusCode = err.statusCode || 500;
//     let message = err.message || 'Server Error';

//     // Check if the error is a custom one (like your ErrorResponse)
//     if (err.isOperational) { 
//         statusCode = err.statusCode;
//         message = err.message;
//     } 
    
//     // Specific check for the address limit error (which is handled by your userController)
//     if (err.message && err.message.includes("Maximum address limit")) {
//         statusCode = 400; // Bad Request
//         message = err.message;
//     }


//     // --- CRITICAL FIX: Ensure the response is JSON ---
//     // Instead of using 'next(err)', we directly use 'res.status().json()'.
    
//     // For development, you might want to show the stack trace, 
//     // but the frontend requires a clean JSON response.
//     res.status(statusCode).json({
//         success: false,
//         error: message,
//         // Only include stack in development
//         stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, 
//     });
// };

// // If this is a separate file (e.g., errorHandler.js):
// // export default errorHandler;

// // If this is in app.js or server.js, ensure it's registered last:
// // app.use(errorHandler);