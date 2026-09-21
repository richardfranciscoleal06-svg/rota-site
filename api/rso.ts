import { handler } from '../netlify/functions/rso';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
