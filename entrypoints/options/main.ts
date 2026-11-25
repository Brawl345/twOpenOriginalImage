import { createApp } from 'vue';
import '../../assets/options.css';
import { browser } from 'wxt/browser';
import { t } from '../../lib/i18n';
import App from './App.vue';

document.documentElement.lang = browser.i18n.getUILanguage();
document.title = t('ext_title');
createApp(App).mount('#app');
