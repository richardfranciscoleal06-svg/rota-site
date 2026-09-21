import { handler } from '../netlify/functions/login';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
