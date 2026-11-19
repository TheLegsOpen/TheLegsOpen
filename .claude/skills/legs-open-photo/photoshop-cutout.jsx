// Batch cut-out for Legs Open player photos. Put this file in a working folder (under photo-work/,
// which git ignores) beside an originals/ folder of photos; it opens each one, runs Photoshop's
// Remove Background (falling back to Select Subject + mask), and saves a transparent PNG to png/.
// Originals are never overwritten. Progress and errors go to log.txt next to this script.
#target photoshop

(function () {
  var root = new File($.fileName).parent;
  var src = new Folder(root + "/originals");
  var out = new Folder(root + "/png");
  if (!out.exists) out.create();
  var log = new File(root + "/log.txt");
  log.open("w");
  function say(s) { log.writeln(new Date().toTimeString().slice(0, 8) + " " + s); }

  var oldDialogs = app.displayDialogs;
  app.displayDialogs = DialogModes.NO;
  var oldUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var files = src.getFiles(/\.(jpe?g|png|webp)$/i);
  say("found " + files.length + " files");

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var doc = null;
    try {
      doc = app.open(f);
      if (doc.mode !== DocumentMode.RGB) doc.changeMode(ChangeMode.RGB);
      if (doc.layers.length > 1) doc.flatten();
      var layer = doc.activeLayer;
      if (layer.isBackgroundLayer) layer.isBackgroundLayer = false;

      var how = "removeBackground";
      try {
        executeAction(stringIDToTypeID("removeBackground"), undefined, DialogModes.NO);
      } catch (e1) {
        how = "selectSubject";
        var d = new ActionDescriptor();
        d.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
        executeAction(stringIDToTypeID("autoCutout"), d, DialogModes.NO);
        // Mask from the selection.
        var m = new ActionDescriptor();
        m.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
        var r = new ActionReference();
        r.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
        m.putReference(charIDToTypeID("At  "), r);
        m.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("RvlS"));
        executeAction(charIDToTypeID("Mk  "), m, DialogModes.NO);
      }

      var name = f.name.replace(/\.[^.]+$/, "") + ".png";
      var opts = new PNGSaveOptions();
      opts.compression = 6;
      opts.interlaced = false;
      doc.saveAs(new File(out + "/" + name), opts, true, Extension.LOWERCASE);
      say("ok " + f.name + " via " + how + " -> " + name);
    } catch (e) {
      say("FAILED " + f.name + ": " + e);
    }
    if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
  }

  app.preferences.rulerUnits = oldUnits;
  app.displayDialogs = oldDialogs;
  say("done");
  log.close();
})();
