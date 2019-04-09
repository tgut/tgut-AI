(function () {
  // Localize jQuery variable
  var jQuery;

  /******** Load jQuery if not present *********/
  if (window.jQuery === undefined || window.jQuery.fn.jquery !== "3.2.1") {
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("type", "text/javascript");
    scriptTag.setAttribute("src", "https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js");
    if (scriptTag.readyState) {
      scriptTag.onreadystatechange = function () { // For old versions of IE
        if (this.readyState === "complete" || this.readyState === "loaded") {
          scriptLoadHandler();
        }
      };
    } else {
      scriptTag.onload = scriptLoadHandler;
    }
    // Try to find the head, otherwise default to the documentElement
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(scriptTag);
    const canvasScript = document.createElement("script");
    canvasScript.setAttribute("type", "text/javascript");
    canvasScript.setAttribute("src", "https://cdn.jsdelivr.net/npm/fingerprintjs2@1.8.0/dist/fingerprint2.min.js");
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(canvasScript);
  } else {
    jQuery = window.jQuery;// The jQuery version on the window is the one we want to use
    main();
  }

  
  function scriptLoadHandler() {
    /******** Called once jQuery has loaded ******/
    // Restore $ and window.jQuery to their previous values and store the new jQuery in our local jQuery variable
    jQuery = window.jQuery.noConflict(true);
    main();
  }

  /******** Our main function ********/
  function main() {
    jQuery(document).ready(function($) {
      var key, widgetId, environment; //required params
      const customParam = []; //holds custom params
      const elem = document.getElementById("abbot-script");

      for (let i = 0; i < elem.attributes.length; i++) {
        const attrib = elem.attributes[i];
        if (attrib.specified && attrib.name.indexOf("data-") !== -1) {
          if (attrib.name === "data-env")
            environment = attrib.value;
          else if (attrib.name === "data-wid")
            widgetId = attrib.value;
          else if (attrib.name === "data-key")
            key = attrib.value;
          else
            customParam.push({ Name: attrib.name.replace("data-", "").replace("_", " "), Value: attrib.value });
        }
      }
     
      if (environment === null || environment === undefined || key === null || widgetId === null) {
        //bad setup, missing a required param, maybe log an error here?
        console.log("Your setup is missing a required parameter.");
        return false;
      }

      var host = "https://" + environment; //localhost
      if (environment === "prod") {
        host = "https://mapixl.com";
      } else if (environment === "dev") {
        host = "https://qa.mapixl.com";
      }

      //**get querystring values**
      const utmData = {
        utmSource: getParameterByName('utm_source'),
        utmMedium: getParameterByName('utm_medium'),
        utmCampaign: getParameterByName('utm_campaign'),
        utmTerm: getParameterByName('utm_term'),
        utmContent: getParameterByName('utm_content'),
        isGoogleAd: (getParameterByName('gclid') ? true : false),
        refererUrl: document.referrer
      };

      //**get canvas data and then make call once data is returned **
      new window.Fingerprint2().get(function (result, components) {
        const canvasData = processFingerprint(result, components);
        const customData = { jsonCustomParmeters: JSON.stringify(customParam), utmValues: JSON.stringify(utmData), canvasValues: JSON.stringify(canvasData) };

        /******* Load HTML or make impression call *******/
        const url = host + "/widget/getwidget/" + key + "/" + widgetId + "/" + encodeURIComponent(environment.replace(":", "|")) +
          "?originUrl=" + encodeURIComponent(document.location.href) + "&callback=?";
        jQuery.ajax({
          url: url,
          type: "post",
          contentType: "application/x-www-form-urlencoded",
          data: customData,
          cache: false,
          dataType: "json",
          jsonp: false,
          success: function (data) { //successfully loaded html form 
            if (data.html && data.html.length > 0) {
              $("#abbot-widget").html(data.html);
              $("#abbot-widget").attr("impressionid", data.impressionId);
            }
          },
          error: function (xhr) {
            console.log("error with call: " + xhr);
          }
        });
      });

      const cssLink = $("<link>",
        {
          rel: "stylesheet",
          type: "text/css",
          href: host + "/content/widgetcss/widget.css?sddd2dd22adsa6"
        });
      cssLink.appendTo("head");
      return false;
    });
  }
}) (); // We call our anonymous function immediately

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function processFingerprint(result, components) {
  var canvasResult = {
    canvasId: result,
    adblock: null,
    timezoneOffset: 0,
    touchPoints: 0,
    touchEvent: null,
    touchStart: null,
    platform: "unknown",
    resolution: "unknown"
  };
  for (window.i in components) {
    if (components.hasOwnProperty(window.i)) {
      const value = components[window.i].value;
      switch (components[window.i].key) {
      case "adblock":
        canvasResult.adblock = value;
        break;
      case "timezone_offset":
        canvasResult.timezoneOffset = (value / 60) * -1;
        break;
      case "touch_support":
        canvasResult.touchPoints = value[0];
        canvasResult.touchEvent = value[1];
        canvasResult.touchStart = value[2];
        break;
      case "navigator_platform":
        if (canvasResult.platform === "unknown") {
          canvasResult.platform = value;
        }
        break;
      case "user_agent":
        if (value.indexOf("WOW64") !== -1 || value.indexOf("Win64") !== -1) {
          canvasResult.platform = "Win64";
        }
        break;
      case "resolution":
        canvasResult.resolution = value[0] + "x" + value[1];
        break;
      }
    }
  }
  return canvasResult;
}