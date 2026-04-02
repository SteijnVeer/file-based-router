import type { NextFunction, Request, Response } from 'express';

function responderMiddleware(req: Request, res: Response, next: NextFunction) {
  res.resolve = ({ status, message, data } = {}) => {
    res.status(status ?? 200).json({
      success: true,
      message: message ?? 'Request successful.',
      data: data ?? null,
    });
  };
  res.reject = (({ status, message, error } = {}) => {
    res.status(status ?? 500).json({
      success: false,
      message: message ?? 'An error occurred while processing the request.',
      error: error instanceof Error ? error.message : error ?? null,
    });
  }) as typeof res.reject;
  res.reject.forbidden = () => res.reject({ status: 403, message: 'Forbidden' });
  res.reject.notFound = () => res.reject({ status: 404, message: 'Not Found' });
  res.reject.badRequest = () => res.reject({ status: 400, message: 'Bad Request' });
  res.reject.internalError = () => res.reject({ status: 500, message: 'Internal Server Error' });
  next();
}

declare global {
  namespace Express {
    interface Request {
      user: null;
    }
    interface Response {
      resolve: (details?: {
        status?: number;
        message?: string;
        data?: object | null;
      }) => void;
      reject: {
        (details?: {
          status?: number;
          message?: string;
          error?: Error | string;
        }): void;
        forbidden(): void;
        notFound(): void;
        badRequest(): void;
        internalError(): void;
      };
    }
  }
}


export { responderMiddleware };

