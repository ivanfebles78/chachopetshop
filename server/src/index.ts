import { createApp } from './app.js';
import { env } from './env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🐾 Chacho Pet Shop API escuchando en http://localhost:${env.PORT}`);
});
