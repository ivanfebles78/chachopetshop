import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/*
 * Con `globals: false` —que es lo que queremos, para que cada fichero declare
 * lo que usa— Testing Library NO limpia sola entre casos. Sin esto, cada
 * `render` se acumula en el mismo documento y las consultas empiezan a
 * encontrar «varios elementos» que en realidad son el mismo, repetido.
 */
afterEach(() => cleanup());
