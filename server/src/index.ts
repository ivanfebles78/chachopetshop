import { createApp } from './app.js';
import { env } from './env.js';
import { arrancarLimpiezaDeReservas } from './lib/limpieza.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🐾 Chacho Pet Shop API escuchando en http://localhost:${env.PORT}`);

  /*
   * La limpieza de reservas vencidas arranca AQUÍ y no en `createApp()`.
   *
   * `createApp()` lo llaman también las pruebas, decenas de veces por suite: si
   * el intervalo viviera ahí, cada caso dejaría un temporizador suelto tocando
   * la base de datos mientras otro caso comprueba el stock. Las pruebas de la
   * limpieza llaman a la función directamente, que es más honesto y no depende
   * de esperar a que salte un reloj.
   */
  arrancarLimpiezaDeReservas();
});
