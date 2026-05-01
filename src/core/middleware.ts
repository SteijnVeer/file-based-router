import { defineMiddlerware } from '../utils/defineRoute';

const responderMiddleware = defineMiddlerware((req, res, next) => {
  res.resolve = (({ status, message, data } = {}) => {
    res.status(status ?? 200).json({
      success: true,
      message: message ?? 'Request successful.',
      data: data ?? null,
    });
  }) as typeof res.resolve;
  res.resolve.created = (data?: any) => res.resolve({ status: 201, message: 'Resource created successfully.', data });
  res.resolve.accepted = (data?: any) => res.resolve({ status: 202, message: 'Request accepted.', data });
  res.resolve.found = (data?: any) => res.resolve({ status: 200, message: 'Resource found.', data });
  res.resolve.updated = (data?: any) => res.resolve({ status: 200, message: 'Resource updated successfully.', data });
  res.resolve.deleted = (data?: any) => res.resolve({ status: 200, message: 'Resource deleted successfully.', data });
  res.resolve.noContent = () => res.resolve({ status: 204, message: 'No content.' });
  res.reject = (({ status, message, error } = {}) => {
    res.status(status ?? 500).json({
      success: false,
      message: message ?? 'An error occurred while processing the request.',
      error: error instanceof Error ? error.message : error ?? 'An error occurred.',
    });
  }) as typeof res.reject;
  res.reject.forbidden = (error) => res.reject({ status: 403, message: 'Forbidden', error });
  res.reject.notFound = (error) => res.reject({ status: 404, message: 'Not Found', error });
  res.reject.badRequest = (error) => res.reject({ status: 400, message: 'Bad Request', error });
  res.reject.internalError = (error) => res.reject({ status: 500, message: 'Internal Server Error', error });
  next();
});


export { responderMiddleware };
export default responderMiddleware;

