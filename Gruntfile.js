const getDeployPath = (server, { user, branch } = {}) =>
  `/Users/${user || process.env.USER}/Library/Application Support/Screeps/scripts/${server}/${branch || 'default'}/`;
const localServer = '127_0_0_1___21025';
const remoteServer = 'screeps.com';

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    deploy: {
      local: {
        expand: true,
        flatten: true,
        cwd: 'src/',
        src: '**',
        dest: getDeployPath(localServer),
        filter: 'isFile',
      },
      server: {
        expand: true,
        flatten: true,
        cwd: 'src/',
        src: '**',
        dest: getDeployPath(remoteServer),
        filter: 'isFile',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.renameTask('copy', 'deploy');

  // Default task(s).
  grunt.registerTask('default', ['deploy:local']);
};
