/*jshint expr: true*/
/*global describe, it, beforeEach, module, inject, expect, io */

/**
 * Created by dpamio on 29/05/14.
 */

var app, $sailsBind, $sailsBindHelper, $rootScope, $q, $timeout;
describe('the angular sailsjs bind service', function (){
    'use strict';

    beforeEach(function (){
        //setup the driver angular app.
        app = angular.module("testApp", ['ngSailsBind']);
        module('testApp');

        inject(function($injector, _$timeout_, _$sailsBind_, _$sailsBindHelper_, _$rootScope_, _$q_){
            $sailsBind = _$sailsBind_;
            $sailsBindHelper = _$sailsBindHelper_;
            $rootScope = _$rootScope_;
            $q = _$q_;
            $timeout = _$timeout_;
            //$timeout.flush();
        });
    });

    it('should have defined set of exports', function(){
        expect(angular.isFunction($sailsBind.bind)).to.be.true;
        expect(angular.isFunction($sailsBind.on)).to.be.true;
        expect(angular.isFunction($sailsBind.save)).to.be.true;
        expect(angular.isFunction($sailsBind.update)).to.be.true;
        expect(angular.isFunction($sailsBind.config)).to.be.true;
        expect(angular.isFunction($sailsBind.default)).to.be.true;
    });

    describe('the bind function', function(){
        var modelName = "myModelItem";
        var scopeProperty = modelName + "s";
        //scopeProperty = modelName + ".s";
        var defaultData;

        beforeEach(function(){
            defaultData = [
                {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'},
                {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': '10'}
            ];

            //Mock the initial "get all"
            io.socket.when.get["/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind(modelName, $rootScope);
            $timeout.flush();
        });

        it('should create a model named ' + modelName, function(){
            expect($rootScope[scopeProperty]).to.be.an("array");
        });
        it('should load the model with the contents from the backend', function(){
            expect(io.socket.requestCalled.url).to.equal("/" + modelName + "/");

            expect($rootScope[scopeProperty]).to.deep.equal(defaultData);
        });

        it('should update the model when a new element is ADDED in the backend', function(){
            //Simulate an "on-created" event sent from the server for this model
            io.socket.triggerOn(modelName, 'created', {'id': '3', 'modelAttribute1': "new", 'modelAttribute2': 'data'});
            $timeout.flush();
            expect($rootScope[scopeProperty]).to.have.length(3);
        });

        it('should update the model when an  element is DELETED in the backend', function(){
            var removedData = {'id': 2};

            //Mock server so it doesn't return item #2 anymore.
            io.socket.when.get["/" + modelName] =
            { return: {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'}
            };

            //Mock server to find nothing when finding item #2,
            io.socket.when.get["/" + modelName + "?id=" + removedData.id ] = {return: {error: "id not found"}};

            //Simulate an "on-delete" event sent from the server for this model
            io.socket.triggerOn(modelName, 'destroyed', removedData, removedData.id);
            $timeout.flush();

            expect($rootScope[scopeProperty]).to.have.length(1);
        });

        it('should update the model when an is MODIFIED in the backend', function(){
            var modifiedItem = {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': 'not10'};

            //Simulate someone has modified item 2 in the database.
            io.socket.triggerOn(modelName, 'updated', modifiedItem, modifiedItem.id);
            $timeout.flush();

            expect($rootScope[scopeProperty][1]).to.deep.equal(modifiedItem);
        });

        it('should persist in the backend when a new element is ADDED in the client', function(){
            var newElementCreatedInClient = {name: "newElement"},
                newElementAsReturnedByBackend = {id: 3, name: "newElement"};

            //Mock the server to accept the creation and return the ID of the newly created item.
            io.socket.when.put["/" + modelName + "/create/"] = {return: newElementAsReturnedByBackend};

            //Mock the server to return the new item after it Setup so that the backend
            //     returns the newly created item with the id.
            io.socket.when.get["/" + modelName + "/?id=" + newElementAsReturnedByBackend.id] = {
                return: newElementAsReturnedByBackend
            };

            //Modify the model
            $rootScope[scopeProperty].push(newElementCreatedInClient);
            //$timeout.flush();
            $rootScope.$apply();
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.putCalled.data).to.deep.equal(newElementCreatedInClient);
            expect(io.socket.putCalled.url).to.equal("/" + modelName + "/create/");
            expect($rootScope[scopeProperty][2]).to.deep.equal(newElementAsReturnedByBackend);
        });

        it('should persist in the backend when an element is REMOVED in the client', function(){
            var removedData = $rootScope[scopeProperty].pop();

            //Setup backend to simulate the item wasn't removed there yet.
            io.socket.when.get["/" + modelName + "?id=" + removedData.id] = {return: removedData};

            //Setup the socket mock to return the id of the deleted item
            io.socket.when.delete["/" + modelName + "/destroy/?id=" + removedData.id] = {return: removedData};

            //Modify the model (actually "apply" and "flush" the deletion).
            $rootScope.$apply();
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.deleteCalled.url).to.equal("/" + modelName + "/destroy/?id=" + removedData.id);
        });

        it('should persist in the backend when a new element is MODIFIED in the client', function(){
            var dataToModify = $rootScope[scopeProperty][1];

            //Setup backend to simulate the item wasn't removed there yet.
            //io.socket.when.get["/" + modelName + "?id=" + removedData.id] = {return: removedData};

            //Setup the socket mock to return the id of the deleted item
            //io.socket.when.delete["/" + modelName + "/destroy/" + removedData.id] = {return: removedData};

            //Modify the model (actually "apply" and "flush" the deletion).
            $rootScope[scopeProperty][1].modelAttribute1 = "another string";
            $rootScope.$apply();

            //Check that things were sent to the server as expected
            expect(io.socket.postCalled.url).to.equal("/" + modelName + "/update/?id=" + dataToModify.id);
            expect(io.socket.postCalled.data).to.deep.equal(dataToModify);
        });

        it('should  filter the initial model load using the criteria specified in the third argument.', function(){
            var query = {'modelAttribute1': "4"};
            //Do the binding.
            $sailsBind.bind(modelName, $rootScope, query);
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.requestCalled.additional).to.equal(query);

        });
    });

    describe('the bind function with binding to user defined property', function(){
        var modelName = "myModelItem";
        var scopeProperty = "myProperty";
        var defaultData;

        beforeEach(function(){
            defaultData = [
                {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'},
                {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': '10'}
            ];

            //Mock the initial "get all"
            io.socket.when.get["/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind({
                model: modelName,
                scopeProperty: scopeProperty
            }, $rootScope);
            $timeout.flush();
        });

        it('should create a model named ' + scopeProperty, function(){
            expect($rootScope[scopeProperty]).to.be.an("array");
        });

        it('should load the model with the contents from the backend', function(){
            expect(io.socket.requestCalled.url).to.equal("/" + modelName + "/");

            expect($rootScope[scopeProperty]).to.deep.equal(defaultData);
        });
    });

    describe('the bind function with binding to user defined sub-property', function(){
        var modelName = "myModelItem";
        var scopeProperty = "myProperty.mySubProperty";
        var defaultData;

        beforeEach(function(){
            defaultData = [
                {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'},
                {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': '10'}
            ];

            //Mock the initial "get all"
            io.socket.when.get["/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind({
                model: modelName,
                scopeProperty: scopeProperty
            }, $rootScope, $sailsBindHelper);
            $timeout.flush();
        });

        it('should create a model named ' + scopeProperty, function(){
            expect($sailsBindHelper.getObjectProperty($rootScope, scopeProperty)).to.be.an("array");
        });

        it('should load the model with the contents from the backend', function(){
            expect(io.socket.requestCalled.url).to.equal("/" + modelName + "/");

            expect($sailsBindHelper.getObjectProperty($rootScope, scopeProperty)).to.deep.equal(defaultData);
        });
    });

    describe('the bind function with prefix', function(){
        var modelName = "myModelItem";
        var defaultData;
        var scopeProperty = modelName + "s";

        beforeEach(function(){
            defaultData = [
                {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'},
                {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': '10'}
            ];

            //Mock the initial "get all"
            io.socket.when.get["/api/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind("api/" + modelName, $rootScope);
            $timeout.flush();
        });

        it('should create a model named ' + modelName, function(){
            expect($rootScope[scopeProperty]).to.be.an("array");
        });
        it('should load the model with the contents from the backend', function(){
            expect(io.socket.requestCalled.url).to.equal("/api/" + modelName + "/");

            expect($rootScope[scopeProperty]).to.deep.equal(defaultData);
        });

        it('should update the model when a new element is ADDED in the backend', function(){
            //Simulate an "on-created" event sent from the server for this model
            io.socket.triggerOn(modelName, 'created', {'id': '3', 'modelAttribute1': "new", 'modelAttribute2': 'data'});
            $timeout.flush();
            expect($rootScope[scopeProperty]).to.have.length(3);
        });

        it('should update the model when an  element is DELETED in the backend', function(){
            var removedData = {'id': 2};

            //Mock server so it doesn't return item #2 anymore.
            io.socket.when.get["/api/" + modelName] =
            { return: {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'}
            };

            //Mock server to find nothing when finding item #2,
            io.socket.when.get["/api/" + modelName + "?id=" + removedData.id ] = {return: {error: "id not found"}};

            //Simulate an "on-delete" event sent from the server for this model
            io.socket.triggerOn(modelName, 'destroyed', removedData, removedData.id);
            $timeout.flush();

            expect($rootScope[scopeProperty]).to.have.length(1);
        });

        it('should update the model when an is MODIFIED in the backend', function(){
            var modifiedItem = {'id': '2', 'modelAttribute1': "4", 'modelAttribute2': 'not10'};

            //Simulate someone has modified item 2 in the database.
            io.socket.triggerOn(modelName, 'updated', modifiedItem, modifiedItem.id);
            $timeout.flush();

            expect($rootScope[scopeProperty][1]).to.deep.equal(modifiedItem);
        });

        it('should persist in the backend when a new element is ADDED in the client', function(){
            var newElementCreatedInClient = {name: "newElement"},
                newElementAsReturnedByBackend = {id: 3, name: "newElement"};

            //Mock the server to accept the creation and return the ID of the newly created item.
            io.socket.when.put["/api/" + modelName + "/create/"] = {return: newElementAsReturnedByBackend};

            //Mock the server to return the new item after it Setup so that the backend
            //     returns the newly created item with the id.
            io.socket.when.get["/api/" + modelName + "/?id=" + newElementAsReturnedByBackend.id] = {
                return: newElementAsReturnedByBackend
            };

            //Modify the model
            $rootScope[scopeProperty].push(newElementCreatedInClient);
            //$timeout.flush();
            $rootScope.$apply();
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.putCalled.data).to.deep.equal(newElementCreatedInClient);
            expect(io.socket.putCalled.url).to.equal("/api/" + modelName + "/create/");
            expect($rootScope[scopeProperty][2]).to.deep.equal(newElementAsReturnedByBackend);
        });

        it('should persist in the backend when an element is REMOVED in the client', function(){
            var removedData = $rootScope[scopeProperty].pop();

            //Setup backend to simulate the item wasn't removed there yet.
            io.socket.when.get["/api/" + modelName + "?id=" + removedData.id] = {return: removedData};

            //Setup the socket mock to return the id of the deleted item
            io.socket.when.delete["/api/" + modelName + "/destroy/?id=" + removedData.id] = {return: removedData};

            //Modify the model (actually "apply" and "flush" the deletion).
            $rootScope.$apply();
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.deleteCalled.url).to.equal("/api/" + modelName + "/destroy/?id=" + removedData.id);
        });

        it('should persist in the backend when a new element is MODIFIED in the client', function(){
            var dataToModify = $rootScope[scopeProperty][1];

            //Setup backend to simulate the item wasn't removed there yet.
            //io.socket.when.get["/" + modelName + "?id=" + removedData.id] = {return: removedData};

            //Setup the socket mock to return the id of the deleted item
            //io.socket.when.delete["/" + modelName + "/destroy/" + removedData.id] = {return: removedData};

            //Modify the model (actually "apply" and "flush" the deletion).
            $rootScope[scopeProperty][1].modelAttribute1 = "another string";
            $rootScope.$apply();

            //Check that things were sent to the server as expected
            expect(io.socket.postCalled.url).to.equal("/api/" + modelName + "/update/?id=" + dataToModify.id);
            expect(io.socket.postCalled.data).to.deep.equal(dataToModify);
        });

        it('should  filter the initial model load using the criteria specified in the third argument.', function(){
            var query = {'modelAttribute1': "4"};
            //Do the binding.
            $sailsBind.bind("api/" + modelName, $rootScope, query);
            $timeout.flush();

            //Check that things were sent to the server as expected
            expect(io.socket.requestCalled.additional).to.equal(query);

        });
    });

    describe('the bind function with prefix, when the server returns an object instead of an array', function(){
        var modelName = "myModelItem";
        var defaultData;
        var scopeProperty = modelName + "s";

        beforeEach(function(){
            defaultData =
            {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'};

            //Mock the initial "get all"
            io.socket.when.get["/api/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind('api/' + modelName, $rootScope);
            $timeout.flush();
        });

        it('should still create an array in the scope', function(){
            expect($rootScope[scopeProperty]).to.be.an("array");
        });
    });


    describe('the bind function, when the server returns an object instead of an array', function(){
        var modelName = "myModelItem";
        var defaultData;
        var scopeProperty = modelName + "s";

        beforeEach(function(){
            defaultData =
            {'id': '1', 'modelAttribute1': "string", 'modelAttribute2': 'another string'};

            //Mock the initial "get all"
            io.socket.when.get["/" + modelName + "/"] = {return: defaultData};

            //Do the binding.
            $sailsBind.bind(modelName, $rootScope);
            $timeout.flush();
        });

        it('should still create an array in the scope', function(){
            expect($rootScope[scopeProperty]).to.be.an("array");
        });
    });

});