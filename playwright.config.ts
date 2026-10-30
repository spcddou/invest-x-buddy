import { defineConfig,devices } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',timeout:120000,use:{baseURL:process.env.BASE_URL||'http://localhost:3000',viewport:{width:1280,height:800},trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],reporter:[['list'],['html',{open:'never'}]]});
