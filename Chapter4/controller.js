function TodoCtrl($scope) {

    var defaultDropText = "Or drop files here";
    $scope.dropText = defaultDropText;
    
    var dragOver = function(e) {
        e.stopPropagation();
        e.preventDefault();
        var valid = e.dataTransfer && e.dataTransfer.types && 
            (e.dataTransfer.types.indexOf('Files') >= 0 ||
             e.dataTransfer.types.indexOf('text/uri-list') >= 0)
         $scope.$apply(function() {
            $scope.dropText = valid ? "Drop files and remote images and they will become Todos" :
                "Can only drop files and remote images here";
            $scope.dropClass = valid ? "dragging" : "invalid-dragging";
        });
    }
    
    var dragLeave = function(e) {
        $scope.$apply(function() {
            $scope.dropText = defaultDropText;
            $scope.dropClass = "";
        });
    }
    
    var drop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var newTodos = [];
        
        if (e.dataTransfer.types.indexOf('Files') >= 0) {
            var files = e.dataTransfer.files;
            for (var i = 0; i < files.length; i++) {
                var text = files[i].name + ', ' + files[i].size + ' bytes';
                newTodos.push({text: text, done: false, file: files[i]});
                
                AddFile(files[i]);
            }
        } else {
            var uri = e.dataTransfer.getData("text/uri-list");
            newTodos.push({text: uri, done: false, uri: uri});
        }
        
        $scope.$apply(function() {
            $scope.dropText = defaultDropText;
            $scope.dropClass = "";
            
            for (var i = 0; i < newTodos.length; i++) {
                $scope.todos.push(newTodos[i]);
            }
            
            $scope.save();
        });
    }
    
    document.body.addEventListener("dragover", dragOver, false);
    document.body.addEventListener("dragleave", dragLeave, false);
    document.body.addEventListener("drop", drop, false);
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    
    chrome.storage.sync.get('todolist', function(value) {
        //the $apply is only necessary to execute the function inside Angular scope
        $scope.$apply(function() {
            $scope.load(value);
        });
    });
    
    $scope.load = function(value) {
        if (value && value.todolist) {
            $scope.todos = value.todolist;
        } else {
            $scope.todos = [
                {text:'learn angular', done:true},
                {text:'build an angular Chrome packaged app', done:false}
            ];
        }
    }
    
    $scope.save = function() {
        chrome.storage.sync.set({'todolist': $scope.todos});
    }

    $scope.todos = [];
    
    $scope.addTodo = function() {
        $scope.todos.push({text:$scope.todoText, done:false});
        $scope.todoText = '';
    };
    
    $scope.remaining = function() {
        var count = 0;
        angular.forEach($scope.todos, function(todo) {
            count += todo.done ? 0 : 1;
        });
        return count;
    };
    
    $scope.archive = function() {
        var oldTodos = $scope.todos;
        $scope.todos = [];
        angular.forEach(oldTodos, function(todo) {
            if (!todo.done) $scope.todos.push(todo);
        });
    };
    
    function onInitFs(fs) {
        console.log('Opened file system: ' + fs.name);
        fsAccess = fs;
    }
    var fsAccess;
    
    function AddFile(file) {
        fsAccess.root.getFile(file.name, {create: true, exclusive: false}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    console.log('Write completed.');
                };
                
                fileWriter.onerror = function(e) {
                    console.log('Write error: ' + e);
                };
                
                fileWriter.write(file);
            });
        }, errorHandler);
    }
    
    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

  console.log('Error: ' + msg);
    }
    navigator.webkitPersistentStorage.requestQuota( 1024*1024, 
        function(grantedBytes) {
            window.requestFileSystem(window.PERSISTENT, grantedBytes, onInitFs, errorHandler);
        }, function(e) {
            console.log('Error', e);
        }
    );
}