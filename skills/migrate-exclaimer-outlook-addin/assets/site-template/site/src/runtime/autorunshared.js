(function () {
  var CONFIG_URL = "__BASE_URL__/config/signatures.json";
  var FETCH_TIMEOUT_MS = 10000;

  if (typeof Office !== "undefined" && typeof Office.onReady === "function") {
    Office.onReady();
  }

  function warn(message, detail) {
    if (typeof console !== "undefined" && console.warn) {
      if (detail) {
        console.warn("[Signature Add-in] " + message, detail);
      } else {
        console.warn("[Signature Add-in] " + message);
      }
    }
  }

  function finish(event) {
    try {
      if (event && event.completed) {
        event.completed();
      }
    } catch (err) {
      warn("event.completed failed", err);
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value) {
    var url = String(value || "");
    if (/^https:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) {
      return url.replace(/"/g, "%22");
    }
    return "";
  }

  function line(label, valueHtml) {
    if (!valueHtml) {
      return "";
    }

    return '<div style="margin:0 0 4px 0;white-space:nowrap;">' +
      '<span style="font-weight:bold;">' + escapeHtml(label) + '</span> ' +
      valueHtml +
      "</div>";
  }

  function footerHtml(user) {
    var lines = user.footerLines || [];
    var html = "";
    var i;

    for (i = 0; i < lines.length; i += 1) {
      html += escapeHtml(lines[i]);
      if (i < lines.length - 1) {
        html += "<br>";
      }
    }

    if (!html) {
      return "";
    }

    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;color:#666;margin-top:10px;">' +
      html +
      "</div>";
  }

  function logoImg(user) {
    var logoUrl = safeUrl(user.logoUrl);
    var logoWidth = parseInt(user.logoWidth, 10) || 160;
    var logoAlt = escapeHtml(user.logoAlt || "Company logo");

    if (!logoUrl) {
      return "";
    }

    return '<img src="' + logoUrl + '" width="' + logoWidth + '" alt="' + logoAlt + '" style="display:block;border:0;outline:none;text-decoration:none;width:' + logoWidth + "px;max-width:" + logoWidth + 'px;height:auto;">';
  }

  function buildTokens(user) {
    var tokens = {};
    var key;
    var email = String(user.email || "");
    var website = String(user.website || "");
    var websiteLabel = escapeHtml(user.websiteLabel || website);
    var emailHref = safeUrl("mailto:" + email);
    var websiteHref = safeUrl(website);

    for (key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        if (typeof user[key] === "string" || typeof user[key] === "number") {
          tokens[key] = escapeHtml(user[key]);
        }
      }
    }

    tokens.emailHref = emailHref;
    tokens.websiteHref = websiteHref;
    tokens.logoImg = logoImg(user);
    tokens.footerHtml = footerHtml(user);
    tokens.phoneLine = line("T", user.phone ? escapeHtml(user.phone) : "");
    tokens.mobileLine = line("M", user.mobile ? escapeHtml(user.mobile) : "");
    tokens.emailLine = line("E", emailHref ? '<a href="' + emailHref + '" style="color:#222;text-decoration:none;">' + escapeHtml(email) + "</a>" : "");
    tokens.websiteLine = line("W", websiteHref ? '<a href="' + websiteHref + '" style="color:#222;text-decoration:none;">' + websiteLabel + "</a>" : "");

    return tokens;
  }

  function renderTemplate(template, tokens) {
    return String(template || "").replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, function (_match, tokenName) {
      return tokens[tokenName] || "";
    });
  }

  function buildSignatureHtml(cfg, user, isReply) {
    var templates = user.templates || cfg.templates || {};
    var template = isReply ? (templates.reply || templates.newMail) : (templates.newMail || templates.reply);

    if (!template) {
      warn("No signature template configured.");
      return "";
    }

    return renderTemplate(template, buildTokens(user));
  }

  function fetchJson(url) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error("Config fetch timed out"));
        }
      }, FETCH_TIMEOUT_MS);

      if (typeof fetch !== "function") {
        clearTimeout(timer);
        reject(new Error("Fetch API is unavailable"));
        return;
      }

      fetch(url, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Config fetch failed with HTTP " + response.status);
          }
          return response.json();
        })
        .then(function (json) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(json);
          }
        })
        .catch(function (err) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  function setSignature(item, html, event) {
    if (!html) {
      finish(event);
      return;
    }

    item.body.setSignatureAsync(
      html,
      { coercionType: Office.CoercionType.Html },
      function (result) {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          warn("Signature insertion failed.", result.error);
        }
        finish(event);
      }
    );
  }

  function checkClientSignature(item) {
    if (!item || typeof item.isClientSignatureEnabledAsync !== "function") {
      return;
    }

    try {
      item.isClientSignatureEnabledAsync(function (result) {
        if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
          warn("Outlook built-in client signature is still enabled; duplicates are possible.");
        }
      });
    } catch (err) {
      warn("Client signature check failed", err);
    }
  }

  function getSenderAddress(item, callback) {
    if (!item.from || typeof item.from.getAsync !== "function") {
      var fallbackAddress = Office.context.mailbox &&
        Office.context.mailbox.userProfile &&
        Office.context.mailbox.userProfile.emailAddress;

      if (fallbackAddress) {
        warn("From API is unavailable; using mailbox profile email.");
        callback(String(fallbackAddress).toLowerCase());
        return;
      }

      callback("");
      return;
    }

    item.from.getAsync(function (result) {
      if (result.status === Office.AsyncResultStatus.Succeeded && result.value && result.value.emailAddress) {
        callback(String(result.value.emailAddress).toLowerCase());
        return;
      }

      var fallback = Office.context.mailbox &&
        Office.context.mailbox.userProfile &&
        Office.context.mailbox.userProfile.emailAddress;

      if (fallback) {
        warn("Using mailbox profile email because From address was unavailable.", result.error);
        callback(String(fallback).toLowerCase());
        return;
      }

      callback("");
    });
  }

  function isReplyCompose(typeValue) {
    var composeType = typeValue && (typeValue.composeType || typeValue);
    var newMail = Office.MailboxEnums &&
      Office.MailboxEnums.ComposeType &&
      Office.MailboxEnums.ComposeType.NewMail;

    return composeType !== newMail;
  }

  function applySignature(event) {
    try {
      applySignatureCore(event);
    } catch (err) {
      warn("Unhandled signature handler failure.", err);
      finish(event);
    }
  }

  function applySignatureCore(event) {
    var item = Office.context.mailbox.item;

    if (!item || !item.body || typeof item.body.setSignatureAsync !== "function") {
      warn("setSignatureAsync is unavailable in this Outlook client.");
      finish(event);
      return;
    }

    checkClientSignature(item);

    getSenderAddress(item, function (sender) {
      if (!sender) {
        warn("Sender address is unavailable.");
        finish(event);
        return;
      }

      if (typeof item.getComposeTypeAsync !== "function") {
        warn("Compose type lookup is unavailable in this Outlook client.");
        finish(event);
        return;
      }

      item.getComposeTypeAsync(function (typeResult) {
        if (typeResult.status !== Office.AsyncResultStatus.Succeeded) {
          warn("Compose type lookup failed.", typeResult.error);
          finish(event);
          return;
        }

        fetchJson(CONFIG_URL)
          .then(function (cfg) {
            var users = cfg && cfg.users ? cfg.users : {};
            var user = users[sender];

            if (!user) {
              warn("No signature config for sender " + sender + ".");
              finish(event);
              return;
            }

            setSignature(item, buildSignatureHtml(cfg, user, isReplyCompose(typeResult.value)), event);
          })
          .catch(function (err) {
            warn("Signature config fetch/parse failed.", err);
            finish(event);
          });
      });
    });
  }

  if (typeof globalThis !== "undefined") {
    globalThis.applySignature = applySignature;
  }

  if (typeof Office !== "undefined" && Office.actions && Office.actions.associate) {
    Office.actions.associate("applySignature", applySignature);
  }
})();
