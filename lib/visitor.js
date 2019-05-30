/*
 * @title: In Title Edit
 * @description: In User Settings Edit
 * @author: smk17
 * @LastEditors: Do not edit
 * @Date: 2018-08-18 10:25:20
 * @LastEditTime: 2019-05-30 15:21:29
 */
/**
 * @file visitor
 * transform 'ESM import' syntax to a customized syntax:
 * @author alienzhou
 */

const t = require("babel-types");
const template = require("babel-template");

/* ********************************************** */

// store the specifiers in one importDeclaration
let specifiers = [];

/********************************************************************************/
/*************************** visitor for babel plugin ***************************/
/********************************************************************************/
const specifierVisitor = {
  ImportNamespaceSpecifier(_path) {
    let data = {
      type: "NAMESPACE",
      local: _path.node.local.name
    };

    this.specifiers.push(data);
  },

  ImportSpecifier(_path) {
    let data = {
      type: "COMMON",
      local: _path.node.local.name,
      imported: _path.node.imported ? _path.node.imported.name : null
    };

    this.specifiers.push(data);
  },

  ImportDefaultSpecifier(_path) {
    let data = {
      type: "DEFAULT",
      local: _path.node.local.name
    };

    this.specifiers.push(data);
  }
};

/**
 * convert import infos to the customized function
 * @param {Object} param0 specifier info
 * @return {expression} require expression
 */
function constructSyncRequire({ local, type, imported, moduleName, syncFunc }) {
  let declaration;

  /* using template instead of origin type functions */
  const namespaceTemplate = template(`
    var LOCAL = ${syncFunc}(MODULE_NAME);
`);

  const commonTemplate = template(`
    var LOCAL = ${syncFunc}(MODULE_NAME)[IMPORTED];
`);

  const defaultTemplate = template(`
    var LOCAL = ${syncFunc}(MODULE_NAME)['default'];
`);

  const sideTemplate = template(`
    ${syncFunc}(MODULE_NAME);
`);
  switch (type) {
    case "NAMESPACE":
      declaration = namespaceTemplate({
        LOCAL: t.identifier(local),
        MODULE_NAME: t.stringLiteral(moduleName)
      });
      break;

    case "COMMON":
      imported = imported || local;
      declaration = commonTemplate({
        LOCAL: t.identifier(local),
        MODULE_NAME: t.stringLiteral(moduleName),
        IMPORTED: t.stringLiteral(imported)
      });
      break;

    case "DEFAULT":
      declaration = defaultTemplate({
        LOCAL: t.identifier(local),
        MODULE_NAME: t.stringLiteral(moduleName)
      });
      break;

    case "SIDE":
      declaration = sideTemplate({
        MODULE_NAME: t.stringLiteral(moduleName)
      });
      break;

    default:
      break;
  }

  return declaration;
}

const visitor = {
  // modify dynamic import
  Import: {
    enter(path, { opts = {} }) {
      let callNode = path.parentPath.node;
      let nameNode =
        callNode.arguments && callNode.arguments[0] && callNode.arguments[0];
      let { externalScheme, asyncFunc, asyncFuncAttr } = opts;

      asyncFunc = asyncFunc == null ? "__my_require__" : asyncFunc;
      asyncFuncAttr = asyncFuncAttr == null ? "async" : asyncFuncAttr;
      externalScheme =
        externalScheme == null ? /^runtime:/ : new RegExp(externalScheme);

      if (
        t.isCallExpression(callNode) &&
        t.isStringLiteral(nameNode) &&
        externalScheme.test(nameNode.value)
      ) {
        let args = callNode.arguments;
        path.parentPath.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.identifier(asyncFunc),
              t.identifier(asyncFuncAttr),
              false
            ),
            args
          )
        );
      }
    }
  },

  // modify esm import
  ImportDeclaration: {
    enter(path) {
      // traverse and collect different specifiers
      path.traverse(specifierVisitor, { specifiers });
    },

    exit(path, { opts = {} }) {
      let { externalScheme, syncFunc, isReplaceScheme } = opts;
      let moduleName = path.node.source.value;
      syncFunc = syncFunc == null ? "__my_require__" : syncFunc;
      isReplaceScheme = isReplaceScheme == null ? true : isReplaceScheme;
      externalScheme =
        externalScheme == null ? /^runtime:/ : new RegExp(externalScheme);

      // if a external module
      if (
        t.isStringLiteral(path.node.source) &&
        externalScheme.test(moduleName)
      ) {
        if (isReplaceScheme) {
          moduleName = moduleName.replace(externalScheme, "");
        }

        let nodes;
        if (specifiers.length === 0) {
          nodes = constructSyncRequire({
            syncFunc,
            moduleName,
            type: "SIDE"
          });
          nodes = [nodes];
        } else {
          nodes = specifiers.map(s => {
            s.moduleName = moduleName;
            s.syncFunc = syncFunc;
            return constructSyncRequire(s);
          });
        }

        // replacing with the customized require functions to passby webpack
        path.replaceWithMultiple(nodes);
      }

      specifiers = [];
    }
  }
};
/***************************************************************************************/

module.exports.visitor = visitor;
