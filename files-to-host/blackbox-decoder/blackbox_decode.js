
var BlackboxDecodeModule = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(moduleArg = {}) {

// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = moduleArg;

// Set up the promise that indicates the Module is initialized
var readyPromiseResolve, readyPromiseReject;
Module['ready'] = new Promise((resolve, reject) => {
  readyPromiseResolve = resolve;
  readyPromiseReject = reject;
});
["_decode","_memory","___indirect_function_table","onRuntimeInitialized"].forEach((prop) => {
  if (!Object.getOwnPropertyDescriptor(Module['ready'], prop)) {
    Object.defineProperty(Module['ready'], prop, {
      get: () => abort('You are getting ' + prop + ' on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js'),
      set: () => abort('You are setting ' + prop + ' on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js'),
    });
  }
});

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = true;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary;

if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof importScripts == 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  if (typeof read != 'undefined') {
    read_ = read;
  }

  readBinary = (f) => {
    if (typeof readbuffer == 'function') {
      return new Uint8Array(readbuffer(f));
    }
    let data = read(f, 'binary');
    assert(typeof data == 'object');
    return data;
  };

  readAsync = (f, onload, onerror) => {
    setTimeout(() => onload(readBinary(f)));
  };

  if (typeof clearTimeout == 'undefined') {
    globalThis.clearTimeout = (id) => {};
  }

  if (typeof setTimeout == 'undefined') {
    // spidermonkey lacks setTimeout but we use it above in readAsync.
    globalThis.setTimeout = (f) => (typeof f == 'function') ? f() : abort();
  }

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit == 'function') {
    quit_ = (status, toThrow) => {
      // Unlike node which has process.exitCode, d8 has no such mechanism. So we
      // have no way to set the exit code and then let the program exit with
      // that code when it naturally stops running (say, when all setTimeouts
      // have completed). For that reason, we must call `quit` - the only way to
      // set the exit code - but quit also halts immediately.  To increase
      // consistency with node (and the web) we schedule the actual quit call
      // using a setTimeout to give the current stack and any exception handlers
      // a chance to run.  This enables features such as addOnPostRun (which
      // expected to be able to run code after main returns).
      setTimeout(() => {
        if (!(toThrow instanceof ExitStatus)) {
          let toLog = toThrow;
          if (toThrow && typeof toThrow == 'object' && toThrow.stack) {
            toLog = [toThrow, toThrow.stack];
          }
          err(`exiting due to exception: ${toLog}`);
        }
        quit(status);
      });
      throw toThrow;
    };
  }

  if (typeof print != 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console == 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != 'undefined' ? printErr : print);
  }

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // When MODULARIZE, this JS may be executed later, after document.currentScript
  // is gone, so we saved it, and we use it here instead of any other info.
  if (_scriptDir) {
    scriptDirectory = _scriptDir;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = '';
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  }

  if (!(typeof window == 'object' || typeof importScripts == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js
read_ = (url) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

if (Module['quit']) quit_ = Module['quit'];legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('asm', 'wasmExports');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_WORKER, 'worker environment detected but not enabled at build time.  Add `worker` to `-sENVIRONMENT` to enable.');

assert(!ENVIRONMENT_IS_NODE, 'node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.');

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary; 
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');

if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// include: base64Utils.js
// Converts a string of base64 into a byte array (Uint8Array).
function intArrayFromBase64(s) {

  var decoded = atob(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0 ; i < decoded.length ; ++i) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}
// end include: base64Utils.js
// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
function _malloc() {
  abort('malloc() called but not included in the build - add `_malloc` to EXPORTED_FUNCTIONS');
}
function _free() {
  // Show a helpful error since we used to include free by default in the past.
  abort('free() called but not included in the build - add `_free` to EXPORTED_FUNCTIONS');
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}
// end include: runtime_shared.js
assert(!Module['STACK_SIZE'], 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
assert(!Module['wasmMemory'], 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
assert(!Module['INITIAL_MEMORY'], 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// Endianness check
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
if (!Module['noFSInit'] && !FS.init.initialized)
  FS.init();
FS.ignorePermissions = false;

TTY.init();
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err(`dependency: ${dep}`);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  readyPromiseReject(e);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
function createExportWrapper(name) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    return f(...args);
  };
}

// include: runtime_exceptions.js
// end include: runtime_exceptions.js
var wasmBinaryFile;
  wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAAB3gIxYAF/AX9gAn9/AX9gAX8AYAN/f38Bf2ACf38AYAN/f38AYAABf2AEf39/fwF/YAZ/f39/f38Bf2AHf39/f39/fwBgAABgA39+fwF+YAR/f39/AGAFf39/f38AYAF9AX1gBX9/f39/AX9gAnx/AXxgAX8BfGAGf39/f39+AX9gAn9/AXxgA39+fwBgAX0Bf2ABfAF9YAF8AXxgB39/f39/f38Bf2AGf3x/f39/AX9gAn5/AX9gBH9+fn8AYAh/f39/f39/fwBgB39/f35/f38BfmACf34BfmABfwF9YAV/f39+fwF/YAN/f34AYAV/fn9/fwBgB39/f39/fX8AYAN/fX0BfWACf3wAYAJ9fQF9YAJ9fwF/YAR/f39+AX5gA35/fwF/YAF8AX5gBX9+fn5+AGACfn4BfGAEf39+fwF+YAR/fn9/AX9gB39/f39+f38Bf2AIf39/f39/f38BfwKlAxEDZW52DV9fYXNzZXJ0X2ZhaWwADANlbnYEZXhpdAACA2VudhBfX3N5c2NhbGxfb3BlbmF0AAcDZW52EV9fc3lzY2FsbF9mY250bDY0AAMDZW52D19fc3lzY2FsbF9pb2N0bAADFndhc2lfc25hcHNob3RfcHJldmlldzEIZmRfd3JpdGUABxZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxB2ZkX3JlYWQABxZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX2Nsb3NlAAADZW52EV9fc3lzY2FsbF9mc3RhdDY0AAEDZW52EF9fc3lzY2FsbF9zdGF0NjQAAQNlbnYUX19zeXNjYWxsX25ld2ZzdGF0YXQABwNlbnYRX19zeXNjYWxsX2xzdGF0NjQAAQNlbnYUZW1zY3JpcHRlbl9tZW1jcHlfanMABQNlbnYWZW1zY3JpcHRlbl9yZXNpemVfaGVhcAAAFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfc2VlawAPA2VudgpfbXVubWFwX2pzABgDZW52CF9tbWFwX2pzADAD+AH2AQoBARMTDQUNBQUACAICAgQABAUFAgQEBAQFHAgCAAEEBQAIBQgCBQgFCAUIHR4BAAAAAAABAQAHAQIAAAAAAAQFAQACAAIEBAQFHwAAAAAAEAQMAgUEFAQUIAUCBAkhCQICAgIMCgMAAAIiAAIK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ASkDACHrAiAKKAKQASGQASAKKAKMASGRASAKKAKIASGSASB7IHwgiAEg6wIgkAEgkQEgkgEQPSHsAiAKKAKQASGTASAKKAJoIZQBQQMhlQEglAEglQF0IZYBIJMBIJYBaiGXASCXASDsAjcDACAKKAJkIZgBQQEhmQEgmAEgmQFqIZoBIAogmgE2AmQgCigCaCGbAUEBIZwBIJsBIJwBaiGdASAKIJ0BNgJoDAALAAsMCgsgCigCmAEhngEgngEQVCAKKAKYASGfAUEQIaABIAogoAFqIaEBIKEBIaIBIJ8BIKIBEFdBACGjASAKIKMBNgJkAkADQCAKKAJkIaQBQQMhpQEgpAEgpQFIIaYBQQEhpwEgpgEgpwFxIagBIKgBRQ0BIAooApwBIakBIAooAmghqgEgCi0AgwEhqwFBASGsASCrASCsAXEhrQECQAJAIK0BRQ0AQQAhrgEgrgEhrwEMAQsgCigCeCGwASAKKAJoIbEBQQIhsgEgsQEgsgF0IbMBILABILMBaiG0ASC0ASgCACG1ASC1ASGvAQsgrwEhtgEgCigCZCG3AUEQIbgBIAoguAFqIbkBILkBIboBQQMhuwEgtwEguwF0IbwBILoBILwBaiG9ASC9ASkDACHtAiAKKAKQASG+ASAKKAKMASG/ASAKKAKIASHAASCpASCqASC2ASDtAiC+ASC/ASDAARA9Ie4CIAooApABIcEBIAooAmghwgFBAyHDASDCASDDAXQhxAEgwQEgxAFqIcUBIMUBIO4CNwMAIAooAmQhxgFBASHHASDGASDHAWohyAEgCiDIATYCZCAKKAJoIckBQQEhygEgyQEgygFqIcsBIAogywE2AmgMAAsACwwJCyAKKAKYASHMASDMARBUIAooAmghzQFBASHOASDNASDOAWohzwEgCiDPATYCZANAIAooAmQh0AEgCigCaCHRAUEIIdIBINEBINIBaiHTASDQASDTAUgh1AFBACHVAUEBIdYBINQBINYBcSHXASDVASHYAQJAINcBRQ0AIAooAmQh2QEgCigCfCHaASDaASgCBCHbASDZASDbAUgh3AEg3AEh2AELINgBId0BQQEh3gEg3QEg3gFxId8BAkAg3wFFDQAgCigCdCHgASAKKAJkIeEBQQIh4gEg4QEg4gF0IeMBIOABIOMBaiHkASDkASgCACHlAUEG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ACAEIAE2AgALELoBIAAoAmAQ8AEgABDwAQsgAyACcgvDAgEDfwJAIAANAEEAIQECQEEAKALw1gRFDQBBACgC8NYEEJwBIQELAkBBACgC2NUERQ0AQQAoAtjVBBCcASABciEBCwJAELkBKAIAIgBFDQADQEEAIQICQCAAKAJMQQBIDQAgABCYASECCwJAIAAoAhQgACgCHEYNACAAEJwBIAFyIQELAkAgAkUNACAAEJkBCyAAKAI4IgANAAsLELoBIAEPCwJAAkAgACgCTEEATg0AQQEhAgwBCyAAEJgBRSECCwJAAkACQCAAKAIUIAAoAhxGDQAgAEEAQQAgACgCJBEDABogACgCFA0AQX8hASACRQ0BDAILAkAgACgCBCIBIAAoAggiA0YNACAAIAEgA2usQQEgACgCKBELABoLQQAhASAAQQA2AhwgAEIANwMQIABCADcCBCACDQELIAAQmQELIAELBQAgAJwLdAEBf0ECIQECQCAAQSsQxwENACAALQAAQfIARyEBCyABQYABciABIABB+AAQxwEbIgFBgIAgciABIABB5QAQxwEbIgEgAUHAAHIgAC0AACIAQfIARhsiAUGABHIgASAAQfcARhsiAUGACHIgASAAQeEARhsL8gICA38BfgJAIAJFDQAgACABOgAAIAAgAmoiA0F/aiABOgAAIAJBA0kNACAAIAE6AAIgACABOgABIANBfWogAToAACADQX5qIAE6AAAgAkEHSQ0AIAAgAToAAyADQXxqIAE6AAAgAkEJSQ0AIABBACAAa0EDcSIEaiIDIAFB/wFxQYGChAhsIgE2AgAgAyACIARrQXxxIgRqIgJBfGogATYCACAEQQlJDQAgAyABNgIIIAMgATYCBCACQXhqIAE2AgAgAkF0aiABNgIAIARBGUkNACADIAE2AhggAyABNgIUIAMgATYCECADIAE2AgwgAkFwaiABNgIAIAJBbGogATYCACACQWhqIAE2AgAgAkFkaiABNgIAIAQgA0EEcUEYciIFayICQSBJDQAgAa1CgYCAgBB+IQYgAyAFaiEBA0AgASAGNwMYIAEgBjcDECABIAY3AwggASAGNwMAIAFBIGohASACQWBqIgJBH0sNAAsLIAALDgAgACgCPCABIAIQsQEL5QIBB38jAEEgayIDJAAgAyAAKAIcIgQ2AhAgACgCFCEF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AS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLAkAgAiADTw0AA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgIgA0cNAAsLIAAL0QEBA38CQAJAIAIoAhAiAw0AQQAhBCACEKwBDQEgAigCECEDCwJAIAMgAigCFCIEayABTw0AIAIgACABIAIoAiQRAwAPCwJAAkAgAigCUEEASA0AIAFFDQAgASEDAkADQCAAIANqIgVBf2otAABBCkYNASADQX9qIgNFDQIMAAsACyACIAAgAyACKAIkEQMAIgQgA0kNAiABIANrIQEgAigCFCEEDAELIAAhBUEAIQMLIAQgBSABEK0BGiACIAIoAhQgAWo2AhQgAyABaiEECyAECwIACwIACzkBAX8jAEEQayIDJAAgACABIAJB/wFxIANBCGoQhAIQ6QEhAiADKQMIIQEgA0EQaiQAQn8gASACGwuHAQECfwJAAkACQCACQQRJDQAgASAAckEDcQ0BA0AgACgCACABKAIARw0CIAFBBGohASAAQQRqIQAgAkF8aiICQQNLDQALCyACRQ0BCwJAA0AgAC0AACIDIAEtAAAiBEcNASABQQFqIQEgAEEBaiEAIAJBf2oiAkUNAgwACwALIAMgBGsPC0EAC9cBAQN/IwBBEGsiAiQAQaCBBRCvASACQQA2AgwgACACQQxqELQBIQMCQAJAAkAgAUUNACADDQELQaCBBRCwAUFkIQEMAQsCQCADKAIEIAFGDQBBoIEFELABQWQhAQwBCyACKAIMIgRBJGpBpIEFIAQbIAMoAiQ2AgBBoIEFELABAkAgAygCECIEQSBxDQAgACABIAMoAiAgBCADKAIMIAMpAxgQhQIaCwJAIAMoAghFDQAgAygCABDwAQtBACEBIAMtABBBIHENACADEPABCyACQRBqJAAgAQtAAQF/AkBBACgCpIEFIgJFDQADQAJAIAIoAgAgAEcNACACDwsCQCABRQ0AIAEgAjYCAAsgAigCJCICDQALC0EAC98BAQF/QWQhBgJAIAANACAFQgyGIQUCQAJAAkAgA0EgcUUNAEGAgAQgAUEPakFwcSIGQShqEPEBIgANAUFQDwsCQCABIAIgAyAEIAVBKBDuASIGQQhqIAYQhgIiAEEASA0AIAYgBDYCDAwCCyAGEPAB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AkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAFBd2oOEgABAgUDBAYHCAkKCwwNDg8QERILIAIgAigCACIBQQRqNgIAIAAgASgCADYCAA8LIAIgAigCACIBQQRqNgIAIAAgATQCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATQCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASkDADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATIBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATMBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATAAADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATEAADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASkDADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASkDADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASkDADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATQCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASsDADkDAA8LIAAgAiADEQQACws+AQF/AkAgAFANAANAIAFBf2oiASAAp0EPcUGA0wRqLQAAIAJyOgAAIABCD1YhAyAAQgSIIQAgAw0ACwsgAQs2AQF/AkAgAFANAANAIAFBf2oiASAAp0EHcUEwcjoAACAAQgdWIQIgAEIDiCEAIAINAAsLIAELiAECAX4DfwJAAkAgAEKAgICAEFoNACAAIQIMAQsDQCABQX9qIgEgACAAQgqAIgJCCn59p0EwcjoAACAAQv////+fAVYhAyACIQAgAw0ACwsCQCACpyIDRQ0AA0AgAUF/aiIBIAMgA0EKbiIEQQpsa0EwcjoAACADQQlLIQUgBCEDIAUNAAsLIAELbwEBfyMAQYACayIFJAACQCACIANMDQAgBEGAwARxDQAgBSABIAIgA2siA0GAAiADQYACSSICGxCfARoCQCACDQADQCAAIAVBgAIQ3AEgA0GA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gyIBfiIFQiCIIAMgBH58IgNCIIh8IANC/////w+DIAIgAX58IgFCIIh8NwMIIAAgAUIghiAFQv////8Pg4Q3AwAL5AMCAn8CfiMAQSBrIgIkAAJAAkAgAUL///////////8AgyIEQoCAgICAgMD/Q3wgBEKAgICAgIDAgLx/fFoNACAAQjyIIAFCBIaEIQQCQCAAQv//////////D4MiAEKBgICAgICAgAhUDQAgBEKBgICAgICAgMAAfCEFDAILIARCgICAgICAgIDAAHwhBSAAQoCAgICAgICACFINASAFIARCAYN8IQUMAQsCQCAAUCAEQoCAgICAgMD//wBUIARCgICAgICAwP//AFEbDQAgAEI8iCABQgSGhEL/////////A4NCgICAgICAgPz/AIQhBQwBC0KAgICAgICA+P8AIQUgBEL///////+//8MAVg0AQgAhBSAEQjCIpyIDQZH3AEkNACACQRBqIAAgAUL///////8/g0KAgICAgIDAAIQiBCADQf+If2oQ9AEgAiAAIARBgfgAIANrEPUBIAIpAwAiBEI8iCACQQhqKQMAQgSGhCEFAkAgBEL//////////w+DIAIpAxAgAkEQakEIaikDAIRCAFKthCIEQoGAgICAgICACFQNACAFQgF8IQUMAQsgBEKAgICAgICAgAhSDQAgBUIBgyAFfCEFCyACQSBqJAAgBSABQoCAgICAgICAgH+DhL8LBgAgACQBCwQAIwELEgBBgIAEJANBAEEPakFwcSQCCwcAIwAjAmsLBAAjAwsEACMCCwQAIwALBgAgACQACxIBAn8jACAAa0FwcSIBJAAgAQsEACMACw0AIAEgAiADIAARCwALJQEBfiAAIAEgAq0gA61CIIaEIAQQggIhBSAFQiCIpxD4ASAFpwsTACAAIAGnIAFCIIinIAIgAxAOCxcAIAAgASACIAMgBCAFpyAFQiCIpxAPCxkAIAAgASACIAMgBKcgBEIgiKcgBSAGEBALC4lXAgBBgIAEC5BTJS4qcy4lMDJkLmdwcy5ncHgALSsgICAwWDB4AC0wWCswWCAwWC0weCsweCAweAByYXcAc29uYXJSYXcAJS4qcy4lMDJkLmdwcy5jc3YAJS4qcy4lMDJkLmNzdgAlbGx1ACVzJWQuJTA3dQAlM3UAJWxsZC4lMDJ1ACVsbGQuJTAxdQAldQBtb3Rvck91dHB1dAB2YmF0TGF0ZXN0AGFtcGVyYWdlTGF0ZXN0ACUuKnMuJTAyZC5ldmVudABCYXJvQWx0AENsZWFuZmxpZ2h0AGZ0AEdQU19udW1TYXQAdXMAc3RyZWFtUmVhZEJpdHMAbXMAYXhpcwBmbGFncwBzdGF0ZUZsYWdzAGZsaWdodE1vZGVGbGFncwBtL3MvcwBtL3MAZGVnL3MAcmFkL3MAJXMAIHByZWRpY3RvcgBjdXJyZW50TWV0ZXIAbG9vcEl0ZXJhdGlvbgBEYXRhIHZlcnNpb24AbmFuAGNtAC9sb2dzL2xvZ2ZpbGUuYmJsAFAgaW50ZXJ2YWwASSBpbnRlcnZhbAByc3NpAGttL2gAbWkvaABmbGlnaHRsb2dEZWNvZGVFbnVtVG9TdHJpbmcAIGVuY29kaW5nACwgcm9sbCwgcGl0Y2gsIGhlYWRpbmcAJWcAaW5mAHZiYXRyZWYAJS42ZgAlLjNmACwgJS4yZiwgJS4yZiwgJS4yZgB0cnVlAHJjUmF0ZQBHUFNfZ3JvdW5kX2NvdXJzZQBmYWxzZQBmYWlsc2FmZVBoYXNlAEZpcm13YXJlIHR5cGUAdGltZQAgbmFtZQBtYXh0aHJvdHRsZQBtaW50aHJvdHRsZQB2YmF0c2NhbGUAZ3lyb19zY2FsZQBneXJvLnNjYWxlAHZiYXRjZWxsdm9sdGFnZQBHUFNfYWx0aXR1ZGUAJWxsZAAgc2lnbmVkAEdQU19zcGVlZAAlM2QACkxvZyAlZCBvZiAlZAAsICVkAC4vL3NyYy9wYXJzZXIuYwAuLy9zcmMvc3RyZWFtLmMAd2IAcndhAEdQU19ob21lWzFdAEdQU19jb29yZFsxXQBHUFNfaG9tZVswXQBHUFNfY29vcmRbMF0AbW90b3JbAHNlcnZvWwBhY2NTbW9vdGhbAEdQU19jb29yZFsAcmNDb21tYW5kWwBneXJvRGF0YVsAZ3lyb0FEQ1sAbWFnQURDWwBHUFNfRklYAG1WAFBBU1NUSFJVAFNPTkFSAFlBV19QAFBJVENIX1JPTExfUABQSVRDSF9QAEJBUk8AVEhST1RUTEVfRVhQTwBSQ19FWFBPAE5BTgBZQVdfSQBQSVRDSF9ST0xMX0kAUElUQ0hfSQBGSVhFRF9XSU5HAExBTkRJTkcAQ0FMSUJSQVRFX01BRwBhY2NfMUcASU5GAFlBV19SQVRFAFBJVENIX1JPTExfUkFURQBQSVRDSF9SQVRFAFJDX1JBVEUAQVVUT1RVTkUATk9ORQBHUFNfRklYX0hPTUUAR1BTX0hPTUUAUkFURV9QUk9GSUxFAFNNQUxMX0FOR0xFAElETEUASEVBREZSRUUASE9SSVpPTl9NT0RFAEFOR0xFX01PREUAWUFXX0QAUElUQ0hfUk9MTF9EAFBJVENIX0QAR1BTX0hPTEQAUlhfTE9TU19ERVRFQ1RFRABMQU5ERUQAbUEAPHRpbWU+MjAwMC0wMS0wMVQlMDJ1OiUwMnU6JTAydS4lMDZ1WjwvdGltZT4AICA8dHJrcHQgbGF0PSIlcyVkLiUwN3UiIGxvbj0iJXMlZC4lMDd1Ij48ZWxlPiVkPC9lbGU+AHsibmFtZSI6IkluZmxpZ2h0IGFkanVzdG1lbnQiLCAidGltZSI6JWxsZCwgImRhdGEiOnsiYWRqdXN0bWVudEZ1bmN0aW9uIjoiJXMiLCJ2YWx1ZSI6AG51bUJpdHMgPD0gMzIAZGVzdExlbiA+IDEAMAAuAC0AICglcykAKG51bGwpACwgY3VycmVudFZpcnR1YWwgKCVzKSwgZW5lcmd5Q3VtdWxhdGl2ZVZpcnR1YWwgKG1BaCkALCBlbmVyZ3lDdW11bGF0aXZlIChtQWgpAEZpZWxkIABTIGZyYW1lOiAAJWQgZnJhbWVzIGZhaWxlZCB0byBkZWNvZGUsIHJlbmRlcmluZyAlZCBsb29wIGl0ZXJhdGlvbnMgdW5yZWFkYWJsZS4gAHRpbWUgKCVzKSwgAHsibmFtZSI6IkF1dG90dW5lIGN5Y2xlIHJlc3VsdCIsICJ0aW1lIjolbGxkLCAiZGF0YSI6eyJvdmVyc2hvdCI6JXMsInRpbWVkb3V0IjolcywicCI6JXUsImkiOiV1LCJkIjoldX19CgB7Im5hbWUiOiJBdXRvdHVuZSBjeWNsZSB0YXJnZXRzIiwgInRpbWUiOiVsbGQsICJkYXRhIjp7ImN1cnJlbnRBbmdsZSI6JS4xZiwidGFyZ2V0QW5nbGUiOiVkLCJ0YXJnZXRBbmdsZUF0UGVhayI6JWQsImZpcnN0UGVha0FuZ2xlIjolLjFmLCJzZWNvbmRQZWFrQW5nbGUiOiUuMWZ9fQoAeyJuYW1lIjoiTG9nZ2luZyByZXN1bWUiLCAidGltZSI6JWxsZCwgImRhdGEiOnsibG9nSXRlcmF0aW9uIjolZH19CgB7Im5hbWUiOiJBdXRvdHVuZSBjeWNsZSBzdGFydCIsICJ0aW1lIjolbGxkLCAiZGF0YSI6eyJwaGFzZSI6JWQsImN5Y2xlIjolZCwicCI6JXUsImkiOiV1LCJkIjoldSwicmlzaW5nIjolZH19CgB7Im5hbWUiOiJHdHVuZSByZXN1bHQiLCAidGltZSI6JWxsZCwgImRhdGEiOnsiYXhpcyI6JWQsImd5cm9BVkciOiVkLCJuZXdQIjolZH19CgB7Im5hbWUiOiJVbmtub3duIGV2ZW50IiwgInRpbWUiOiVsbGQsICJkYXRhIjp7ImV2ZW50SUQiOiVkfX0KAHsibmFtZSI6IlN5bmMgYmVlcCIsICJ0aW1lIjolbGxkfQoAeyJuYW1lIjoiTG9nIGNsZWFuIGVuZCIsICJ0aW1lIjolbGxkfQoARmxhZyBidWZmZXIgdG9vIHNob3J0CgBEYXRhIGZpbGUgY29udGFpbmVkIG5vIGV2ZW50cwoARGF0YSBmaWxlIGlzIG1pc3NpbmcgZmllbGQgbmFtZSBkZWZpbml0aW9ucwoAU3RhdGlzdGljcwoARmFpbGVkIHRvIGNyZWF0ZSBvdXRwdXQgZmlsZSAlcwoARmFpbGVkIHRvIGNyZWF0ZSBldmVudCBsb2cgZmlsZSAlcwoAQXR0ZW1wdGVkIHRvIGJhc2UgcHJlZGljdGlvbiBvbiBHUFMgaG9tZSBwb3NpdGlvbiB3aXRob3V0IEdQUyBob21lIGZyYW1lIGRlZmluaXRpb24KAEJhZCBzcGVlZCB1bml0IGluIGNvbnZlcnNpb24KAEZyYW1lcyAlOWQgJTYuMWYgYnl0ZXMgYXZnICU4ZCBieXRlcyB0b3RhbAoAJWMgZnJhbWVzICU3ZCAlNi4xZiBieXRlcyBhdmcgJThkIGJ5dGVzIHRvdGFsCgBIIFByb2R1Y3Q6QmxhY2tib3ggZmxpZ2h0IGRhdGEgcmVjb3JkZXIgYnkgTmljaG9sYXMgU2hlcmxvY2sKAENhbid0IHNpbXVsYXRlIHRoZSBJTVUgYmVjYXVzZSBhY2NlbGVyb21ldGVyIG9yIGd5cm9zY29wZSBkYXRhIGlzIG1pc3NpbmcKAAoKICAgIEZpZWxkIG5hbWUgICAgICAgICAgTWluICAgICAgICAgIE1heCAgICAgICAgUmFuZ2UKAERhdGEgcmF0ZSAlNHVIeiAlNnUgYnl0ZXMvcyAlMTB1IGJhdWQKACUxNHMgJTEybGxkICUxMmxsZCAlMTJsbGQKAEF0dGVtcHRlZCB0byBiYXNlIHByZWRpY3Rpb24gb24gbW90b3JbMF0gd2l0aG91dCB0aGF0IGZpZWxkIGJlaW5nIGRlZmluZWQKAEF0dGVtcHRlZCB0byBjb252ZXJ0IHNwZWVkIHRvIHJhdyB1bml0cyBidXQgdGhpcyBkYXRhIGlzIGFscmVhZHkgY29va2VkCgBGcmFtZXMgJThkCgAlNWQgJTEzZCAlMTNkCgBCYWQgdGltZSB1bml0ICVkCgBCYWQgYW1wZXJhZ2UgdW5pdCAlZAoAVW5zdXBwb3J0ZWQgZmllbGQgcHJlZGljdG9yICVkCgBVbnN1cHBvcnRlZCBmaWVsZCBlbmNvZGluZyAlZAoAJWMgRnJhbWUgdW51c3VhYmxlIGR1ZSB0byBwcmlvciBjb3JydXB0aW9uLCBvZmZzZXQgJWQsIHNpemUgJWQKAEZhaWxlZCB0byBkZWNvZGUgJWMgZnJhbWUsIG9mZnNldCAlZCwgc2l6ZSAlZAoALCAlYywgb2Zmc2V0ICVkLCBzaXplICVkCgBCYWQgdW5pdCBmb3IgZmllbGQgJWQKAE5vIGZpZWxkcyBmb3VuZCBpbiBsb2csIGlzIGl0IG1pc3NpbmcgaXRzIGhlYWRlcj8KADwvdHJrcHQ+CgA8L3Rya3NlZz48L3Ryaz4KADx0cms+PG5hbWU+QmxhY2tib3ggZmxpZ2h0IGxvZzwvbmFtZT48dHJrc2VnPgoAQ291bGRuJ3QgbG9hZCBsb2cgIyVkIGZyb20gdGhpcyBmaWxlLCBiZWNhdXNlIHRoZXJlIGFyZSBvbmx5ICVkIGxvZ3MgaW4gdG90YWwuCgBEYXRhIHJhdGU6IFVua25vd24sIG5vIHRpbWluZyBpbmZvcm1hdGlvbiBhdmFpbGFibGUuCgBEZWNvZGluZyBsb2cgJyVzJyB0byAnJXMnLi4uCgAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t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dmFpbGFibGUASW52YWxpZCBzZWVrAENyb3NzLWRldmljZSBsaW5rAFJlYWQtb25seSBmaWxlIHN5c3RlbQBEaXJlY3Rvcnkgbm90IGVtcHR5AENvbm5lY3Rpb24gcmVzZXQgYnkgcGVlcgBPcGVyYXRpb24gdGltZWQgb3V0AENvbm5lY3Rpb24gcmVmdXNlZABIb3N0IGlzIGRvd24ASG9zdCBpcyB1bnJlYWNoYWJsZQBBZGRyZXNzIGluIHVzZQBCcm9rZW4gcGlwZQBJL08gZXJyb3IATm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcwBCbG9jayBkZXZpY2UgcmVxdWlyZWQATm8gc3VjaCBkZXZpY2UATm90IGEgZGlyZWN0b3J5AElzIGEgZGlyZWN0b3J5AFRleHQgZmlsZSBidXN5AEV4ZWMgZm9ybWF0IGVycm9yAEludmFsaWQgYXJndW1lbnQAQXJndW1lbnQgbGlzdCB0b28gbG9uZwBTeW1ib2xpYyBsaW5rIGxvb3AARmlsZW5hbWUgdG9vIGxvbmcAVG9vIG1hbnkgb3BlbiBmaWxlcyBpbiBzeXN0ZW0ATm8gZmlsZSBkZXNjcmlwdG9ycyBhdmFpbGFibGUAQmFkIGZpbGUgZGVzY3JpcHRvcgBObyBjaGlsZCBwcm9jZXNzAEJhZCBhZGRyZXNzAEZpbGUgdG9vIGxhcmdlAFRvbyBtYW55IGxpbmtzAE5vIGxvY2tzIGF2YWlsYWJsZQBSZXNvdXJjZSBkZWFkbG9jayB3b3VsZCBvY2N1cgBTdGF0ZSBub3QgcmVjb3ZlcmFibGUAUHJldmlvdXMgb3duZXIgZGllZABPcGVyYXRpb24gY2FuY2VsZWQARnVuY3Rpb24gbm90IGltcGxlbWVudGVkAE5vIG1lc3NhZ2Ugb2YgZGVzaXJlZCB0eXBlAElkZW50aWZpZXIgcmVtb3ZlZABEZXZpY2Ugbm90IGEgc3RyZWFtAE5vIGRhdGEgYXZhaWxhYmxlAERldmljZSB0aW1lb3V0AE91dCBvZiBzdHJlYW1zIHJlc291cmNlcwBMaW5rIGhhcyBiZWVuIHNldmVyZWQAUHJvdG9jb2wgZXJyb3IAQmFkIG1lc3NhZ2UARmlsZSBkZXNjcmlwdG9yIGluIGJhZCBzdGF0ZQBOb3QgYSBzb2NrZXQARGVzdGluYXRpb24gYWRkcmVzcyByZXF1aXJlZABNZXNzYWdlIHRvbyBsYXJnZQBQcm90b2NvbCB3cm9uZyB0eXBlIGZvciBzb2NrZXQAUHJvdG9jb2wgbm90IGF2YWlsYWJsZQBQcm90b2NvbCBub3Qgc3VwcG9ydGVkAFNvY2tldCB0eXBlIG5vdCBzdXBwb3J0ZWQATm90IHN1cHBvcnRlZABQcm90b2NvbCBmYW1pbHkgbm90IHN1cHBvcnRlZABBZGRyZXNzIGZhbWlseSBub3Qgc3VwcG9ydGVkIGJ5IHByb3RvY29sAEFkZHJlc3Mgbm90IGF2YWlsYWJsZQBOZXR3b3JrIGlzIGRvd24ATmV0d29yayB1bnJlYWNoYWJsZQBDb25uZWN0aW9uIHJlc2V0IGJ5IG5ldHdvcmsAQ29ubmVjdGlvbiBhYm9ydGVkAE5vIGJ1ZmZlciBzcGFjZSBhdmFpbGFibGUAU29ja2V0IGlzIGNvbm5lY3RlZABTb2NrZXQgbm90IGNvbm5lY3RlZABDYW5ub3Qgc2VuZCBhZnRlciBzb2NrZXQgc2h1dGRvd24AT3BlcmF0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MAT3BlcmF0aW9uIGluIHByb2dyZXNzAFN0YWxlIGZpbGUgaGFuZGxlAFJlbW90ZSBJL08gZXJyb3IAUXVvdGEgZXhjZWVkZWQATm8gbWVkaXVtIGZvdW5kAFdyb25nIG1lZGl1bSB0eXBlAE11bHRpaG9wIGF0dGVtcHRlZABSZXF1aXJlZCBrZXkgbm90IGF2YWlsYWJsZQBLZXkgaGFzIGV4cGlyZWQAS2V5IGhhcyBiZWVuIHJldm9rZWQAS2V5IHdhcyByZWplY3RlZCBieSBzZXJ2aWNlAAAAAAAAAAAAAAAAAAAAAAClAlsA8AG1BYwFJQGDBh0DlAT/AMcDMQMLBrwBjwF/A8oEKwDaBq8AQgNOA9wBDgQVAKEGDQGUAgsCOAZkArwC/wJdA+cECwfPAssF7wXbBeECHgZFAoUAggJsA28E8QDzAxgF2QDaA0wGVAJ7AZ0DvQQAAFEAFQK7ALMDbQD/AYUELwX5BDgAZQFGAZ8AtwaoAXMCUwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhBAAAAAAAAAAALwIAAAAAAAAAAAAAAAAAAAAAAAAAADUERwRWBAAAAAAAAAAAAAAAAAAAAACgBAAAAAAAAAAAAAAAAAAAAAAAAEYFYAVuBWEGAADPAQAAAAAAAAAAyQbpBvkGHgc5B0kHXgcAAAAAAAAAAAAAAAAZAAoAGRkZAAAAAAUAAAAAAAAJAAAAAAsAAAAAAAAAABkAEQoZGRkDCgcAAQAJCxgAAAkGCwAACwAGGQAAABkZGQAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAZAAoNGRkZAA0AAAIACQ4AAAAJAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAEwAAAAATAAAAAAkMAAAAAAAMAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA8AAAAEDwAAAAAJEAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAARAAAAABEAAAAACRIAAAAAABIAABIAABoAAAAaGhoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGgAAABoaGgAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAABcAAAAAFwAAAAAJFAAAAAAAFAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAAAAAAAAAAAAAAAVAAAAABUAAAAACRYAAAAAABYAABYAADAxMjM0NTY3ODlBQkNERUYAQZDTBAvoAwAAAAAAAAAAAAAAAAAAAAAAAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAADwAAAAoAAAALAAAADQAAAAAAAAAAAAAAEgAAAAAAAAAAAAAAAAAAAE0EAQA8BAEAxQMBALcDAQAhBAEAGAQBAJ0DAQDXAwEArQQBAJcDAQDRAwEApwQBAGgEAQAxBAEAJwQBAKoDAQDkAwEAugQBAKMDAQDdAwEAswQBAAAAAAAFAAAAAAAAAAAAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARAAAAEAAAADxBAQAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIKgEAAAAAAAUAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAAAAVAAAASEEBAAAEAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAD/////CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAqAQBARwEA';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  var binary = tryParseAsDataURI(file);
  if (binary) {
    return binary;
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'both async and sync fetching of the wasm failed';
}

function getBinaryPromise(binaryFile) {

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then((binary) => {
    return WebAssembly.instantiate(binary, imports);
  }).then(receiver, (reason) => {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(wasmBinaryFile)) {
      err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
  return instantiateArrayBuffer(binaryFile, imports, callback);
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    assert(wasmMemory, 'memory not found in wasm exports');
    // This assertion doesn't hold when emscripten is run in --post-link
    // mode.
    // TODO(sbc): Read INITIAL_MEMORY out of the wasm file in post-link mode.
    //assert(wasmMemory.buffer.byteLength === 16777216);
    updateMemoryViews();

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    receiveInstance(result['instance']);
  }

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {

    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        // If instantiation fails, reject the module ready promise.
        readyPromiseReject(e);
    }
  }

  // If instantiation fails, reject the module ready promise.
  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
  return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
function legacyModuleProp(prop, newName, incoming=true) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get() {
        let extra = incoming ? ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)' : '';
        abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);

      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingGlobal(sym, msg) {
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
        return undefined;
      }
    });
  }
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
        // library.js, which means $name for a JS name with no prefix, or name
        // for a JS name like _name.
        var librarySymbol = sym;
        if (!librarySymbol.startsWith('_')) {
          librarySymbol = '$' + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        warnOnce(msg);
        return undefined;
      }
    });
  }
  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}
// end include: runtime_debug.js
// === Body ===
// end include: preamble.js


  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': abort('to do getValue(i64) use WASM_BIGINT');
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  var ptrToString = (ptr) => {
      assert(typeof ptr === 'number');
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    };

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': abort('to do setValue(i64) use WASM_BIGINT');
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    };

  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  var ___assert_fail = (condition, filename, line, func) => {
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    };

  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },
  basename:(path) => {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },
  join:(...paths) => PATH.normalize(paths.join('/')),
  join2:(l, r) => PATH.normalize(l + '/' + r),
  };
  
  var initRandomFill = () => {
      if (typeof crypto == 'object' && typeof crypto['getRandomValues'] == 'function') {
        // for modern web browsers
        return (view) => crypto.getRandomValues(view);
      } else
      // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
      abort('no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };');
    };
  var randomFill = (view) => {
      // Lazily init on the first invocation.
      return (randomFill = initRandomFill())(view);
    };
  
  
  
  var PATH_FS = {
  resolve:(...args) => {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? args[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },
  relative:(from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      },
  };
  
  
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (typeof window != 'undefined' &&
          typeof window.prompt == 'function') {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else if (typeof readline == 'function') {
          // Command line.
          result = readline();
          if (result !== null) {
            result += '\n';
          }
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
      return address;
    };
  
  var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
  var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (!ptr) return 0;
      return zeroMemory(ptr, size);
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.timestamp = node.timestamp;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw FS.genericErrors[44];
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.parent.timestamp = Date.now()
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          new_dir.timestamp = old_node.parent.timestamp;
          old_node.parent = new_dir;
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  readdir(node) {
          var entries = ['.', '..'];
          for (var key of Object.keys(node.contents)) {
            entries.push(key);
          }
          return entries;
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          // The data buffer should be a typed array view
          assert(!(buffer instanceof ArrayBuffer));
  
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            HEAP8.set(contents, ptr);
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  /** @param {boolean=} noRunDep */
  var asyncLoad = (url, onload, onerror, noRunDep) => {
      var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : '';
      readAsync(url, (arrayBuffer) => {
        assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      }, (event) => {
        if (onerror) {
          onerror();
        } else {
          throw `Loading data file "${url}" failed.`;
        }
      });
      if (dep) addRunDependency(dep);
    };
  
  
  var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    };
  
  var preloadPlugins = Module['preloadPlugins'] || [];
  var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      function processData(byteArray) {
        function finish(byteArray) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == 'string') {
        asyncLoad(url, processData, onerror);
      } else {
        processData(url);
      }
    };
  
  var FS_modeStringToFlags = (str) => {
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  var ERRNO_MESSAGES = {
  0:"Success",
  1:"Arg list too long",
  2:"Permission denied",
  3:"Address already in use",
  4:"Address not available",
  5:"Address family not supported by protocol family",
  6:"No more processes",
  7:"Socket already connected",
  8:"Bad file number",
  9:"Trying to read unreadable message",
  10:"Mount device busy",
  11:"Operation canceled",
  12:"No children",
  13:"Connection aborted",
  14:"Connection refused",
  15:"Connection reset by peer",
  16:"File locking deadlock error",
  17:"Destination address required",
  18:"Math arg out of domain of func",
  19:"Quota exceeded",
  20:"File exists",
  21:"Bad address",
  22:"File too large",
  23:"Host is unreachable",
  24:"Identifier removed",
  25:"Illegal byte sequence",
  26:"Connection already in progress",
  27:"Interrupted system call",
  28:"Invalid argument",
  29:"I/O error",
  30:"Socket is already connected",
  31:"Is a directory",
  32:"Too many symbolic links",
  33:"Too many open files",
  34:"Too many links",
  35:"Message too long",
  36:"Multihop attempted",
  37:"File or path name too long",
  38:"Network interface is not configured",
  39:"Connection reset by network",
  40:"Network is unreachable",
  41:"Too many open files in system",
  42:"No buffer space available",
  43:"No such device",
  44:"No such file or directory",
  45:"Exec format error",
  46:"No record locks available",
  47:"The link has been severed",
  48:"Not enough core",
  49:"No message of desired type",
  50:"Protocol not available",
  51:"No space left on device",
  52:"Function not implemented",
  53:"Socket is not connected",
  54:"Not a directory",
  55:"Directory not empty",
  56:"State not recoverable",
  57:"Socket operation on non-socket",
  59:"Not a typewriter",
  60:"No such device or address",
  61:"Value too large for defined data type",
  62:"Previous owner died",
  63:"Not super-user",
  64:"Broken pipe",
  65:"Protocol error",
  66:"Unknown protocol",
  67:"Protocol wrong type for socket",
  68:"Math result not representable",
  69:"Read only file system",
  70:"Illegal seek",
  71:"No such process",
  72:"Stale file handle",
  73:"Connection timed out",
  74:"Text file busy",
  75:"Cross-device link",
  100:"Device not a stream",
  101:"Bad font file fmt",
  102:"Invalid slot",
  103:"Invalid request code",
  104:"No anode",
  105:"Block device required",
  106:"Channel number out of range",
  107:"Level 3 halted",
  108:"Level 3 reset",
  109:"Link number out of range",
  110:"Protocol driver not attached",
  111:"No CSI structure available",
  112:"Level 2 halted",
  113:"Invalid exchange",
  114:"Invalid request descriptor",
  115:"Exchange full",
  116:"No data (for no delay io)",
  117:"Timer expired",
  118:"Out of streams resources",
  119:"Machine is not on the network",
  120:"Package not installed",
  121:"The object is remote",
  122:"Advertise error",
  123:"Srmount error",
  124:"Communication error on send",
  125:"Cross mount point (not really error)",
  126:"Given log. name not unique",
  127:"f.d. invalid for this operation",
  128:"Remote address changed",
  129:"Can   access a needed shared lib",
  130:"Accessing a corrupted shared lib",
  131:".lib section in a.out corrupted",
  132:"Attempting to link in too many libs",
  133:"Attempting to exec a shared library",
  135:"Streams pipe error",
  136:"Too many users",
  137:"Socket type not supported",
  138:"Not supported",
  139:"Protocol family not supported",
  140:"Can't send after socket shutdown",
  141:"Too many references",
  142:"Host is down",
  148:"No medium (in tape drive)",
  156:"Level 2 not synchronized",
  };
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  ErrnoError:class extends Error {
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(ERRNO_MESSAGES[errno]);
          // TODO(sbc): Use the inline member declaration syntax once we
          // support it in acorn and closure.
          this.name = 'ErrnoError';
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  genericErrors:{
  },
  filesystems:null,
  syncFSRequests:0,
  FSStream:class {
        constructor() {
          // TODO(https://github.com/emscripten-core/emscripten/issues/21414):
          // Use inline field declarations.
          this.shared = {};
        }
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.mounted = null;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.node_ops = {};
          this.stream_ops = {};
          this.rdev = rdev;
          this.readMode = 292/*292*/ | 73/*73*/;
          this.writeMode = 146/*146*/;
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
  lookupPath(path, opts = {}) {
        path = PATH_FS.resolve(path);
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        opts = Object.assign(defaults, opts)
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(32);
        }
  
        // split the absolute path
        var parts = path.split('/').filter((p) => !!p);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  create(path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.chmod(stream.node, mode);
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.chown(stream.node, uid, gid);
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },
  open(path, flags, mode) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        mode = typeof mode == 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path == 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  allocate(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomLeft = randomFill(randomBuffer).byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16384 | 511 /* 0777 */, 73);
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams() {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [44].forEach((code) => {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },
  quit() {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (read_) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(read_(obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          constructor() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText || '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  absolutePath() {
        abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
      },
  createFolder() {
        abort('FS.createFolder has been removed; use FS.mkdir instead');
      },
  createLink() {
        abort('FS.createLink has been removed; use FS.symlink instead');
      },
  joinPath() {
        abort('FS.joinPath has been removed; use PATH.join instead');
      },
  mmapAlloc() {
        abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
      },
  standardizePath() {
        abort('FS.standardizePath has been removed; use PATH.normalize instead');
      },
  };
  
  var SYSCALLS = {
  DEFAULT_POLLMASK:5,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return PATH.join2(dir, path);
      },
  doStat(func, path, buf) {
        var stat = func(path);
        HEAP32[((buf)>>2)] = stat.dev;
        HEAP32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAP32[(((buf)+(12))>>2)] = stat.uid;
        HEAP32[(((buf)+(16))>>2)] = stat.gid;
        HEAP32[(((buf)+(20))>>2)] = stat.rdev;
        (tempI64 = [stat.size>>>0,(tempDouble = stat.size,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(24))>>2)] = tempI64[0],HEAP32[(((buf)+(28))>>2)] = tempI64[1]);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        (tempI64 = [Math.floor(atime / 1000)>>>0,(tempDouble = Math.floor(atime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(40))>>2)] = tempI64[0],HEAP32[(((buf)+(44))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000;
        (tempI64 = [Math.floor(mtime / 1000)>>>0,(tempDouble = Math.floor(mtime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(56))>>2)] = tempI64[0],HEAP32[(((buf)+(60))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000;
        (tempI64 = [Math.floor(ctime / 1000)>>>0,(tempDouble = Math.floor(ctime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(72))>>2)] = tempI64[0],HEAP32[(((buf)+(76))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000;
        (tempI64 = [stat.ino>>>0,(tempDouble = stat.ino,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(88))>>2)] = tempI64[0],HEAP32[(((buf)+(92))>>2)] = tempI64[1]);
        return 0;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  varargs:undefined,
  get() {
        assert(SYSCALLS.varargs != undefined);
        // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
        var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
        SYSCALLS.varargs += 4;
        return ret;
      },
  getp() { return SYSCALLS.get() },
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  };
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 12: {
          var arg = SYSCALLS.getp();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          return 0; // Pretend that the locking is successful.
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_fstat64(fd, buf) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      return SYSCALLS.doStat(FS.stat, stream.path, buf);
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = SYSCALLS.getp();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = SYSCALLS.getp();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = SYSCALLS.getp();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.getp();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = SYSCALLS.getp();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_lstat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doStat(FS.lstat, path, buf);
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & (~6400);
      assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? SYSCALLS.get() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_stat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.doStat(FS.stat, path, buf);
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  
  
  
  
  
  var convertI32PairToI53Checked = (lo, hi) => {
      assert(lo == (lo >>> 0) || lo == (lo|0)); // lo should either be a i32 or a u32
      assert(hi === (hi|0));                    // hi should be a i32
      return ((hi + 0x200000) >>> 0 < 0x400001 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;
    };
  function __mmap_js(len,prot,flags,fd,offset_low, offset_high,allocated,addr) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);;
  
    
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[((allocated)>>2)] = res.allocated;
      HEAPU32[((addr)>>2)] = ptr;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  function __munmap_js(addr,len,prot,flags,fd,offset_low, offset_high) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);;
  
    
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (prot & 2) {
        SYSCALLS.doMsync(addr, stream, len, flags, offset);
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

  var getHeapMax = () =>
      HEAPU8.length;
  
  var abortOnCannotGrowMemory = (requestedSize) => {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  /** @suppress {duplicate } */
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        readyPromiseReject(msg);
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  function _fd_seek(fd,offset_low, offset_high,whence,newOffset) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);;
  
    
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      (tempI64 = [stream.position>>>0,(tempDouble = stream.position,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[((newOffset)>>2)] = tempI64[0],HEAP32[(((newOffset)+(4))>>2)] = tempI64[1]);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    };
  
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };


  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.staticInit();;
function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_fstat64: ___syscall_fstat64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_lstat64: ___syscall_lstat64,
  /** @export */
  __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  __syscall_stat64: ___syscall_stat64,
  /** @export */
  _mmap_js: __mmap_js,
  /** @export */
  _munmap_js: __munmap_js,
  /** @export */
  emscripten_memcpy_js: _emscripten_memcpy_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  exit: _exit,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write
};
var wasmExports = createWasm();
var ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors');
var _decode = Module['_decode'] = createExportWrapper('decode');
var _fflush = createExportWrapper('fflush');
var _emscripten_builtin_memalign = createExportWrapper('emscripten_builtin_memalign');
var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports['emscripten_stack_init'])();
var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'])();
var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'])();
var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'])();
var stackSave = createExportWrapper('stackSave');
var stackRestore = createExportWrapper('stackRestore');
var stackAlloc = createExportWrapper('stackAlloc');
var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])();
var dynCall_jiji = Module['dynCall_jiji'] = createExportWrapper('dynCall_jiji');


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module['cwrap'] = cwrap;
Module['FS'] = FS;
var missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertU32PairToI53',
  'growMemory',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'getCallstack',
  'emscriptenLog',
  'convertPCtoSourceLocation',
  'readEmAsmArgs',
  'jstoi_q',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'handleException',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asmjsMangle',
  'HandleAllocator',
  'getNativeTypeSize',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'stackTrace',
  'getEnvStrings',
  'checkWasiClock',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'createDyncallWrapper',
  'safeSetTimeout',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'getPromise',
  'makePromise',
  'idsToPromises',
  'makePromiseCallback',
  'ExceptionInfo',
  'findMatchingCatch',
  'Browser_asyncPrepareDataCounter',
  'setMainLoop',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_unlink',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'setErrNo',
  'demangle',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

var unexportedSymbols = [
  'run',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'FS_createFolder',
  'FS_createPath',
  'FS_createLazyFile',
  'FS_createLink',
  'FS_createDevice',
  'FS_readFile',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmMemory',
  'wasmExports',
  'stackAlloc',
  'stackSave',
  'stackRestore',
  'getTempRet0',
  'setTempRet0',
  'writeStackCookie',
  'checkStackCookie',
  'intArrayFromBase64',
  'tryParseAsDataURI',
  'convertI32PairToI53Checked',
  'ptrToString',
  'zeroMemory',
  'exitJS',
  'getHeapMax',
  'abortOnCannotGrowMemory',
  'ENV',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'ERRNO_CODES',
  'ERRNO_MESSAGES',
  'DNS',
  'Protocols',
  'Sockets',
  'initRandomFill',
  'randomFill',
  'timers',
  'warnOnce',
  'UNWIND_CACHE',
  'readEmAsmArgsArray',
  'jstoi_s',
  'keepRuntimeAlive',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'wasmTable',
  'noExitRuntime',
  'getCFunc',
  'ccall',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'specialHTMLTargets',
  'findCanvasEventTarget',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'ExitStatus',
  'doReadv',
  'doWritev',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'Browser',
  'getPreloadedImageData__data',
  'wget',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_createDataFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'allocateUTF8',
  'allocateUTF8OnStack',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);



var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run() {

  if (runDependencies > 0) {
    return;
  }

    stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    readyPromiseResolve(Module);
    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    ['stdout', 'stderr'].forEach(function(name) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty?.output?.length) {
        has = true;
      }
    });
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();

// end include: postamble.js



  return moduleArg.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = BlackboxDecodeModule;
else if (typeof define === 'function' && define['amd'])
  define([], () => BlackboxDecodeModule);
