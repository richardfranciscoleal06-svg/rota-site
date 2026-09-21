import { handler } from '../netlify/functions/members';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
