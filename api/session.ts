import { handler } from '../netlify/functions/session';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
