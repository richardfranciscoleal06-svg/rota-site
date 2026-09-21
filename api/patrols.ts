import { handler } from '../netlify/functions/patrols';
import { toVercelHandler } from '../_server/adapter';

export default toVercelHandler(handler);
