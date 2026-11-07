import { none, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

export default eveChannel({
  auth: process.env.VERCEL ? [vercelOidc()] : [none()],
});
