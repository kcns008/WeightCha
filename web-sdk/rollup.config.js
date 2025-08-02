import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const config = [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/weightcha.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external: []
  },
  
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/weightcha.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ],
    external: []
  },
  
  // UMD build (browser)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/weightcha.umd.js',
      format: 'umd',
      name: 'WeightCha',
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  
  // Minified UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/weightcha.min.js',
      format: 'umd',
      name: 'WeightCha',
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: {
          reserved: ['WeightCha']
        }
      })
    ]
  }
];

export default config;
