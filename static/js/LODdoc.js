function jqesc( myid ) {
  return "#" + myid.replace( /(:|\.|\[|\]|,|=|@)/g, "\\$1" );
};

function generateUUID () { // Public Domain/MIT
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
    d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxx0-8xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function supportsImports() {
  return 'import' in document.createElement('link');
}

(function() {
  if ('registerElement' in document
      && 'import' in document.createElement('link')
      && 'content' in document.createElement('template')) {
    // platform is good!
  } else {
    // polyfill the platform!
    var e = document.createElement('script');
    e.src = 'https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/0.7.24/webcomponents-lite.min.js';
    document.body.appendChild(e);
  }
})();

if (window.importQueue == undefined) {
  clearImports();
}

function clearImports() {
  for(var url in window.importQueue) {
    var link = window.importQueue[url];
    $(link).remove();
  }

  window.importQueue={};
}

function interpTaa(root, macroContext) {
  $(root).find("[taa\\:content]").each(function(){
    var commandTag = $(this);
    var val = commandTag.attr("taa:content");
    var url;
    var resource;

    if (val.indexOf(":")>-1) {
      if (/^(f|ht)tps?:\/\//i.test(val)) {
        // Suppose it is whole specification already
      } else {
        var pref = val.split(":");
        // Find prefix attr containing foo: substring.
        var pref_tag = commandTag.closest(`[prefix*=${pref[0]}:]`);
        var s = pref_tag.attr("prefix");
        s = s.split(`${pref[0]}: `)[1].trim().split(" ")[0].trim();
        val=s+pref[1];
      }
    };
    if (val.indexOf("#")>-1) {
      var res = val.split("#");
      url=res[0];
      resource=res[1];
    } else {
      url=val;
      resource="";
    }

    function commandFunction() {
      var imp = this;
      var import_ = imp.import;
      var contents;
      if (import_ != undefined) {
        contents = $(import_);
      } else {
        contents = macroContext;
      }

      if (resource=="competence-list") {
        console.log("Here");

      };

      var rc = contents.find(`${jqesc( resource )}`).clone();

      if (rc.length>0) {
        console.log("Importing " + resource);
        commandTag.empty();
        console.log(rc);
        commandTag.append(rc);
        commandTag.removeAttr("taa:content");
        commandTag.attr("taa:content-expanded", val);
        interpTaa(commandTag, macroContext); // Try to find in calling context
        interpTaa(commandTag, contents);     // Try to find local
      } else {
        console.log("Not Found in import ", resource, url);
      }
    }

    if (url=="") {
      macroContext.each(commandFunction);
    } else {
      var _imp = window.importQueue[url];

      if (_imp == undefined) {

        console.log("Loading ", url);

        var link = document.createElement('link');
        link.rel = 'import';
        link.href = url;
        link.setAttribute('async', ''); // make it async!
        document.head.appendChild(link);

        var import_link = link;

        window.importQueue[url] = {imp:import_link, queue:[function(imp) {
          // console.log("Continuation main ", val, imp);
          $(imp).each(commandFunction);
        }], link:link};

        import_link.onload=(function(){
          var imp=$(this);
          var qe = window.importQueue[url];
          if (qe != undefined) {
            qe.queue.forEach(function(item){
              //console.log("Imp-watch", item, this);
              item(this);
            }, qe.imp);
            qe.queue=[];
          };
        });

        import_link.onerror=(function(event){
          console.log('Error loading import: ', event.target.href);
        });

      } else {
        var import_old = _imp.imp;
        var q = _imp.queue;
        if (q.length>0 ) { // Still loading
          q.push(function(imp) {
            // console.log("Continuation waiting "+ val);
            $(import_old).each(commandFunction);
          });
        } else { // Already loaded
          // console.log("Immediate "+ val);
          $(import_old).each(commandFunction);
        };
      }
    }
  });
};

function generateTableOfContents(selector) {
  var Contents,
      contents,
      newHeading;

  Contents = gajus.Contents;

  if (selector == undefined) {
    selector = "#tableOfContents";
  }

  // Append the generated list element (table of contents) to the container.
  var selected = document.querySelector(selector);
  if (selected != null) {
    contents = Contents({
      articles: $('main').find('h2').not('.nocount').get()
    });

    selected.appendChild(contents.list());

    // Attach event listeners:
    contents.eventEmitter().on('change', function () {
      // console.log('User has navigated to <a href=""></a> new section of the page.');
    });

    // Firing the "resize" event will regenerate the table of contents.
    contents.eventEmitter().trigger('resize');
  }
};



function activateToggleButton(btn, active) {
  if (active == undefined) {
    active=true;
  }
  btn.toggleClass("active", active);
  btn.prop("aria-pressed", `${active}`);
  return active;
}

function deactivateToggleButton(btn) {
  return activateToggleButton(btn, false);
}

function toggleControlPanel() {
  var cbtn=$(this);
  var active = ! cbtn.hasClass("active");
  active = activateToggleButton(cbtn, active);
  $("#controls").toggleClass("active", active);
  var ctrbtns = $("#controls-buttons");
  ctrbtns.toggleClass("hidden", ! active);
  var timeotID = cbtn.data("timeoutID");
  if (active) {
    if (timeotID != undefined) {
      window.clearTimeout(timeotID);
      cbtn.data("timeotID", undefined);
    } else {
      // timeotID = window.setTimeout(function(){
      //   var active = cbtn.hasClass("active");
      //   if (active) {
      //     cbtn.trigger("click");
      //   };
      // }, 5000);
      cbtn.data("timeotID", timeotID);
    }
  } else {
    window.clearTimeout(timeotID);
    cbtn.data("timeotID", undefined);
  }
  // TODO: Implement disappearing/reappearing when mouse leaves control-buttons
  // area.
}

function changeTextSize() {
  var cbtn=$(this);
  var cbtns=cbtn.parent().find("button");
  var cls=cbtn.data("class");
  var piter=cbtn.parent();
  var prevcls=piter.data("class");
  deactivateToggleButton(cbtns);
  activateToggleButton(cbtn);
  var nodes = $("body, html");
  nodes.removeClass(prevcls).addClass(cls);
  piter.data("class", cls);
}

function alert_widget(level, message) {
  var icon = {
    "danger":"ban",
    "success":"check"
  }[level];
  return `<div class="alert alert-${level} alert-dismissible" role="alert">
<button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
  <i class="icon fa fa-${icon}"></i>&nbsp;&nbsp;&nbsp;
  ${message}
</div>`;
}

function saveDocument(saveas, msg) {
  var container = $("#main-document-container");
  var text;
  var apiUrl, oldUUID;
  if (saveas) {
    apiUrl="save-as";
    var docroot=container.find("#main-document");
    var newUUID=generateUUID();
    oldUUID=docroot.data("uuid");
    docroot.data("uuid", newUUID);
    // docroot.find("#main-uuid").attr("content", newUUID);
  } else {
    apiUrl="save";
  }
  var tmpCnt = container.clone();
  tmpCnt.find(".mediumDecorated").remove();
  text = tmpCnt.html();
  var saveUrl = window.location.href + `/@@${apiUrl}`;
  $.ajax({
    type: "POST",
    url: saveUrl,
    data: text,
    contentType: "text/html, charset=utf-8",
    // processData: false, // important
    // contentType: false, // important
    dataType: "json",
    success: function(answer){
      // FIXME: User could not see the message in save-as mode.
      $("#message").html(alert_widget("success", msg));
      if (saveas) {
        alert("save-as? routing to new page?");
        location.href = location.href.replace(oldUUID, newUUID);
      }
    },
    failure: function(errMsg) {
      $("#message").html(alert_widget("alert", errMsg));
    }
  });
  return text;
};

function decorateInclusions(container) {
  var inclusions = container.find("[taa\\:content]");
  inclusions.each(function () {
    var tag = $(this);
    var tc = tag.clone();
    // var html = tc.wrap("p").parent().html();
    var html = this.outerHTML;
    console.log(tag);
    tag.html(`<code class="mediumDecorated"></code>`);
    tag.find("code").text(html);
  });

}

function activateMediumEditor(selector) {
  return new MediumEditor(selector, {
    buttonLabels: 'fontawesome',
    extensions: {
      table: new MediumEditorTable()
    },
    toolbar: {
      buttons: [
        'h2',
        'h3',
        'h4',
        'bold',
        'italic',
        'unorderedlist',
        'orderedlist',
        'table'
      ]/*,
      static: true,
      sticky: true
      */
    }
  });
}

function contentLoad() {
  var cbtn = $(this);
  var container = $("#main-document-container");
  var contentURL=window.location.href+"/@@content";
  var active = cbtn.hasClass('active');

  if (! active) {
    var rc=$.ajax({
      url:contentURL,
      success: function(answer) {
        container.empty();
        container.html(answer);
        $("#message").html(alert_widget("success", "Загружен исходник текста."));
        decorateInclusions(container);

        // window.mediumEditor = new MediumEditor('.editable');
        container.prop("editable-elements", '[property*="cnt:chars"]:not([class~="static"])');
        window.mediumEditor = activateMediumEditor(container.prop("editable-elements"));

        activateToggleButton(cbtn);
      },
      failure: function(errMsg) {
        $("#message").html(alert_widget("alert", errMsg));
      }
    });
  } else {
    deactivateToggleButton(cbtn);
    window.mediumEditor.destroy();
    window.mediumEditor.removeElements(container.prop("editable-elements"));
    var text = saveDocument(false, "Документ успешно сохранен.");
    container.prop("editable-elements", []);
    function setup(text) {
      container.empty();
      container.html(text);
      $("#message").html(alert_widget("success", "Текст перезагружен с сервера."));
      clearImports();
      runMacros(container);
    }
    if (false) {
      var rc = $.ajax({
        url:contentURL,
        success:function(answer){
          setup(answer);
        }
      });
    } else {
      setup(text);
    }
  }
}

function runMacros(root) {
  interpTaa(root, root);
  // FIXME: Should I mark non-expanded macros
  generateTableOfContents();
}

function downloadInnerHtml(filename, selector, mimeType) {
  // var elHtml = $(selector)[0].innerHTML;
  var elHtml = document.documentElement.innerHTML;
  var link = document.createElement('a');
  mimeType = mimeType || 'text/html';

  link.setAttribute('download', filename);
  link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(elHtml));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

var fileName =  'Export.html'; // You can use the .txt extension if you want

// ------------------------  Main function -------


function LODmain(macroButton) {
  if (window.LODloaded == undefined) {
    window.LODloaded = true;
  } else {
    return;
  }
  $("#button-medium-editor-switch").on("click", contentLoad);
  $("#button-export-page").on("click", function() {
    downloadInnerHtml(fileName, '.exportable', 'text/html');
  });
  $("#panel-toggle-button").on("click", toggleControlPanel);
  $("#ctrl-btn-text-size button").on("click", changeTextSize);
  $("#cmd-print-button").on("click", function (){
    window.print();
  });
  $('#cmd-commit-button').click(function(){
    saveDocument(false, "Документ успешно сохранен!");
  });
  $('#cmd-branch-button').click(function(){
    saveDocument(true, "Теперь вы работаете в новой ветке!");
  });

  // $("#controls").on('mouseenter mouseleave', function (event) {
  //   var opacity =  event.type=="mouseenter" ? '1.0' : '0.7';
  //   $(this).animate({"opacity":opacity}, 100);
  // });
  var root = $("html");

  if (macroButton) {
    $("#button-macro-switch").click(function (){
      runMacros(root);
    });
  } else {
    $("#button-macro-switch").addClass("hidden");
    runMacros(root);
  }
};
