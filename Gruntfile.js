/*global module, require*/

var Dgeni = require('dgeni');

module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        // Task configuration.
        clean: {
            force: true,
            dist: ["dist/"]
        },
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            dist: {
                src: [
                    'lib/ngSailsBind.module.js',
                    'lib/$sailsBindHelper.factory.js',
                    'lib/$sailsBind.factory.js'
                ],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        bump: {
            options: {
                commitFiles: ['-a'],
                files: ['package.json', 'bower.json'],
                push: true,
                pushTo: 'origin'
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'karma.config.js',
                'dgeni/dgeni.js',
                'lib/ngSailsBind.module.js',
                'lib/$sailsBindHelper.factory.js',
                'lib/$sailsBind.factory.js',
                'test/*.Spec.js'
            ],
            options: {
                strict: true,
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                globals: {
                    angular: true,
                    window: true
                }
            },
            gruntfile: {
                src: 'Gruntfile.js'
            }
        },
        karma: {
            unit: {
                configFile: 'karma.config.js'
            }
        },
        coveralls: {
            options: {
                debug: true,
                coveragedDir: 'test/coverage',
                dryRun: false,
                force: true,
                recursive: true
            }
        },
        watch: {
            js: {
                files: [
                    'Gruntfile.js',
                    'karma.config.js',
                    'dgeni/dgeni.js',
                    'lib/ngSailsBind.module.js',
                    'lib/$sailsBindHelper.factory.js',
                    'lib/$sailsBind.factory.js',
                    'test/*.Spec.js'
                ],
                tasks: ['karma:unit', 'jshint:all'],
                options: {
                    spawn: false,
                    reload: true
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-karma-coveralls');
    grunt.loadNpmTasks('grunt-conventional-changelog');


    grunt.registerTask('dgeni', 'Generate docs via dgeni.', function() {
        var done = this.async();
        var dgeni = new Dgeni([require('./dgeni/dgeni')]);
        dgeni.generate().then(done);
    });
    grunt.registerTask('default', ['clean:dist', 'concat', 'uglify', 'karma', 'dgeni', 'coveralls']);
    grunt.registerTask('release', ['bump-only', 'default','changelog', 'dgeni', 'bump-commit']);
};
