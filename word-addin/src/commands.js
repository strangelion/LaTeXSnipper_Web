// Office Add-in command handlers
Office.onReady(function () {
  // Commands are handled via the manifest's ShowTaskpane action.
  // This file exists to satisfy the FunctionFile requirement.
});

function getGlobal() { return (typeof self !== 'undefined') ? self : window; }

// Action handler for ribbon button (if custom actions are added later)
function action(event) {
  // Placeholder for custom ribbon actions
}
