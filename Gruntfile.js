module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        tslint: {
            options: {
                configuration: 'tslint.json',
                force: true,
                fix: true
            },
            files: {
                src: [
                    'src/*'
                ]
            }
        },
        ts: {
            default: {
                tsconfig: {
                    passThrough: true
                }
            }
        },
        deploy: {
            'local': {
                expand: true,
                flatten: true,
                src: 'dist/*',
                dest: process.env.SCREEPS_LOCAL,
                filter: 'isFile'
            },
            'server': {
                expand: true,
                flatten: true,
                src: 'dist/*',
                dest: process.env.SCREEPS_SERVER,
                filter: 'isFile'
            },
        }
    });

    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.renameTask('copy', 'deploy');
  
    // Default task(s).
    grunt.registerTask('default', ['tslint', 'ts', 'deploy:local']);
};
