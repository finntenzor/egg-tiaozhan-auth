import { EggPlugin } from 'egg';
// import { join } from 'path';

const plugin: EggPlugin = {
  // passport
  passport: {
    enable: true,
    package: 'egg-passport',
  },

  // tiaozhan-controller-extension
  tiaozhanControllerExtension: {
    enable: true,
    package: 'egg-tiaozhan-controller-extension',
  },

  // tiaozhan-auth
  tiaozhanAuth: {
    enable: true,
    package: 'egg-tiaozhan-auth',
  },
};

export default plugin;
