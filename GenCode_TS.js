"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csharp_1 = require("csharp");
const CodeWriter_1 = require("./CodeWriter");
function genCode(handler, isPuerts = true) {
    let settings = handler.project.GetSettings("Publish").codeGeneration;
    let codePkgName = handler.ToFilename(handler.pkg.name); //convert chinese to pinyin, remove special chars etc.
    let exportCodePath = handler.exportCodePath + '/' + codePkgName;
    let namespaceName = codePkgName;
    let ns = "fgui";
    let isThree = handler.project.type == csharp_1.FairyEditor.ProjectType.ThreeJS;
    if (isPuerts)
        ns = "FairyGUI";
    if (settings.packageName)
        namespaceName = settings.packageName + '.' + namespaceName;
    //CollectClasses(stripeMemeber, stripeClass, fguiNamespace)
    let classes = handler.CollectClasses(settings.ignoreNoname, settings.ignoreNoname, ns);
    handler.SetupCodeFolder(exportCodePath, "ts"); //check if target folder exists, and delete old files
    let getMemberByName = settings.getMemberByName;
    let classCnt = classes.Count;
    let writer = new CodeWriter_1.default({ blockFromNewLine: false, usingTabs: true });
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        let members = classInfo.members;
        let references = classInfo.references;
        writer.reset();
        if (isPuerts) {
            writer.writeln('/* eslint-disable */');
            writer.writeln();
        }
        let refCount = references.Count;
        if (refCount > 0) {
            for (let j = 0; j < refCount; j++) {
                let ref = references.get_Item(j);
                writer.writeln('import %s from "./%s";', ref, ref);
            }
            writer.writeln();
        }
        if (isPuerts) {
            writer.writeln('import { FairyGUI } from "csharp";');
            writer.writeln();
        }
        if (isThree) {
            writer.writeln('import * as fgui from "fairygui-three";');
            if (refCount == 0)
                writer.writeln();
        }
        writer.writeln('export default class %s extends %s', classInfo.className, classInfo.superClassName);
        writer.startBlock();
        writer.writeln();
        let memberCnt = members.Count;
        for (let j = 0; j < memberCnt; j++) {
            let memberInfo = members.get_Item(j);
            writer.writeln('public %s:%s;', memberInfo.varName, memberInfo.type);
        }
        writer.writeln('public static URL:string = "ui://%s%s";', handler.pkg.id, classInfo.resId);
        writer.writeln();
        if (isPuerts) {
            writer.writeln('protected static isBinded = false;');
            writer.writeln();
            writer.writeln('static bind ()');
            writer.startBlock();
            writer.writeln('if (!this.isBinded)');
            writer.startBlock();
            writer.writeln('FairyGUI.UIObjectFactory.SetPackageItemExtension(this.URL, () => new this());');
            writer.writeln('this.isBinded = true;');
            writer.endBlock();
            writer.endBlock();
            writer.writeln();
        }
        writer.writeln('public static createInstance():%s', classInfo.className);
        writer.startBlock();
        if (isPuerts) {
            writer.writeln(`this.bind();`);
            writer.writeln(`const obj = <${classInfo.className}>(${ns}.UIPackage.CreateObject("${handler.pkg.name}", "${classInfo.resName}"));`);
            writer.writeln(`obj.onConstruct();`);
            writer.writeln(`return obj;`);
        }
        else {
            writer.writeln('return <%s>(%s.UIPackage.createObject("%s", "%s"));', classInfo.className, ns, handler.pkg.name, classInfo.resName);
        }
        writer.endBlock();
        writer.writeln();
        writer.writeln('protected onConstruct():void');
        writer.startBlock();
        if (isPuerts) {
            for (let j = 0; j < memberCnt; j++) {
                let memberInfo = members.get_Item(j);
                if (memberInfo.group == 0) {
                    if (getMemberByName) {
                        writer.writeln('this.%s = <%s>(this.GetChild("%s"));', memberInfo.varName, memberInfo.type, memberInfo.name);
                    }
                    else {
                        writer.writeln('this.%s = <%s>(this.GetChildAt(%s));', memberInfo.varName, memberInfo.type, memberInfo.index);
                    }
                    if (!memberInfo.type.startsWith('FairyGUI.')) {
                        writer.writeln(`(this.${memberInfo.varName} as any).onConstruct()`);
                    }
                }
                else if (memberInfo.group == 1) {
                    if (getMemberByName)
                        writer.writeln('this.%s = this.GetController("%s");', memberInfo.varName, memberInfo.name);
                    else
                        writer.writeln('this.%s = this.GetControllerAt(%s);', memberInfo.varName, memberInfo.index);
                }
                else {
                    if (getMemberByName)
                        writer.writeln('this.%s = this.GetTransition("%s");', memberInfo.varName, memberInfo.name);
                    else
                        writer.writeln('this.%s = this.GetTransitionAt(%s);', memberInfo.varName, memberInfo.index);
                }
            }
        }
        else {
            for (let j = 0; j < memberCnt; j++) {
                let memberInfo = members.get_Item(j);
                if (memberInfo.group == 0) {
                    if (getMemberByName)
                        writer.writeln('this.%s = <%s>(this.getChild("%s"));', memberInfo.varName, memberInfo.type, memberInfo.name);
                    else
                        writer.writeln('this.%s = <%s>(this.getChildAt(%s));', memberInfo.varName, memberInfo.type, memberInfo.index);
                }
                else if (memberInfo.group == 1) {
                    if (getMemberByName)
                        writer.writeln('this.%s = this.getController("%s");', memberInfo.varName, memberInfo.name);
                    else
                        writer.writeln('this.%s = this.getControllerAt(%s);', memberInfo.varName, memberInfo.index);
                }
                else {
                    if (getMemberByName)
                        writer.writeln('this.%s = this.getTransition("%s");', memberInfo.varName, memberInfo.name);
                    else
                        writer.writeln('this.%s = this.getTransitionAt(%s);', memberInfo.varName, memberInfo.index);
                }
            }
        }
        writer.endBlock();
        writer.endBlock(); //class
        writer.save(exportCodePath + '/' + classInfo.className + '.ts');
    }
    writer.reset();
    if (!isPuerts) {
        // 脚本中基本会继承所有的类，所以集中绑定没太大必要
        let binderName = codePkgName + 'Binder';
        for (let i = 0; i < classCnt; i++) {
            let classInfo = classes.get_Item(i);
            writer.writeln('import %s from "./%s";', classInfo.className, classInfo.className);
        }
        if (isThree) {
            writer.writeln('import * as fgui from "fairygui-three";');
            writer.writeln();
        }
        if (isPuerts) {
            writer.writeln('import { FairyGUI } from "csharp";');
            writer.writeln('import { $typeof } from "puerts";');
        }
        writer.writeln();
        writer.writeln('export default class %s', binderName);
        writer.startBlock();
        writer.writeln('public static bindAll():void');
        writer.startBlock();
        for (let i = 0; i < classCnt; i++) {
            let classInfo = classes.get_Item(i);
            if (isPuerts) {
                writer.writeln('%s.UIObjectFactory.SetPackageItemExtension(%s.URL, $typeof(%s));', ns, classInfo.className, classInfo.className);
            }
            else {
                writer.writeln('%s.UIObjectFactory.setExtension(%s.URL, %s);', ns, classInfo.className, classInfo.className);
            }
        }
        writer.endBlock(); //bindall
        writer.endBlock(); //class
        writer.save(exportCodePath + '/' + binderName + '.ts');
    }
}
exports.genCode = genCode;
