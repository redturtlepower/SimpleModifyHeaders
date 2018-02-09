 

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * @author didierfred@gmail.com
 * @version 0.2
 */


var line_number = 1;
var started = "off";

window.onload = function() {
	// load configuration from local storage
	var config = JSON.parse(localStorage.getItem("config"));	
	for (var to_add of config.headers) appendLine(to_add.action,to_add.header_name,to_add.header_value,to_add.comment,to_add.status);
	document.getElementById('save_button').addEventListener('click',function (e) {save_data();});
	document.getElementById('export_button').addEventListener('click',function (e) {export_data();});
	document.getElementById('import_button').addEventListener('click',function (e) {import_data(e);});
	document.getElementById('add_button').addEventListener('click',function (e) {appendLine("add","-","-","","off");});
	document.getElementById('start_img').addEventListener('click',function (e) {start_modify();});
	document.getElementById('targetPage').value=config.target_page;
	document.getElementById('targetPage').addEventListener('keyup',function (e) {checkTargetPageField();});
	started = localStorage.getItem("started");
	if (started=="on") document.getElementById("start_img").src = "img/stop.png";	
} ;

/**
* Add a new configuration line on the UI 
**/
function appendLine(action,header_name,header_value,comment,status) {

var html = "<td><select class=\"select_field\" id=\"select_action" + line_number + "\" disable=false><option value=\"add\">add</option><option value=\"modify\">modify</option><option value=\"delete\">delete</option></select></td>";
html = html + "<td><input class=\"input_field\" size=\"15\" id=\"header_name"+ line_number + "\"></input></td>";
html = html + "<td><input class=\"input_field\" size=\"20\" id=\"header_value"+ line_number + "\"></input></td>";
html = html + "<td><input class=\"input_field\" size=\"20\" id=\"comment"+ line_number + "\"></input></td>";
html = html + "<td><select class=\"select_field\" id=\"select_status" + line_number + "\"><option value=\"on\"> on </option><option value=\"off\">off</option></select></td>";
html = html + "<td><input class=\"button\" type=\"button\" value=\"Delete\" id=\"delete_button" + line_number + "\"></input> </td>";

var newTR = document.createElement("tr");
newTR.id="line" + line_number;
newTR.innerHTML = html;
document.getElementById("config_tab").appendChild(newTR);
document.getElementById("select_action"+line_number).value = action;
document.getElementById("select_status"+line_number).value = status;
document.getElementById("header_name"+line_number).value = header_name;
document.getElementById("header_value"+line_number).value = header_value;
document.getElementById("comment"+line_number).value = comment;
var line_number_to_delete = line_number;
document.getElementById('delete_button'+line_number).addEventListener('click',function (e) {delete_line(line_number_to_delete)});
line_number++;
}


/**
* Create a JSON String representing the configuration data 
*
**/
function create_configuration_data()
{
	var tr_elements = document.querySelectorAll("#config_tab tr");
	var headers = [];
	for (i=1;i<tr_elements.length;i++)  // ignore line 1 which is the table header
		{
	
		var action = tr_elements[i].childNodes[0].childNodes[0].value;
		var header_name = tr_elements[i].childNodes[1].childNodes[0].value;
		var header_value = tr_elements[i].childNodes[2].childNodes[0].value;
		var comment = tr_elements[i].childNodes[3].childNodes[0].value;
		var status = tr_elements[i].childNodes[4].childNodes[0].value;
		headers.push({action:action,header_name:header_name,header_value:header_value,comment:comment,status:status});
		}
	var to_export = {format_version:"1.0",target_page:document.getElementById('targetPage').value,headers:headers};
	return JSON.stringify(to_export);
}

/**
*  check if url pattern is valid , if not ,  set the font color to red
**/
function checkTargetPageField()
{
if (isTargetValid(document.getElementById('targetPage').value)) document.getElementById('targetPage').style.color="black";
else document.getElementById('targetPage').style.color="red";
}

/**
* check if url pattern is valid
**/
function isTargetValid(target)
	{
		if (target=="") return true;
		if (target==" ") return true;
		if (target=="*") return true;
		return target.match("(http|https|[\*]):\/\/([\*][\.][^\*]*|[^\*]*|[\*])\/");
	}
/**
* If url pattern is valid save the data to the local storage and restart modify header
**/

function save_data() 
	{
	if (!isTargetValid(document.getElementById('targetPage').value))
		{
			alert("Can not save : Url pattern  is invalid");
			return;
		}
	localStorage.setItem("config",create_configuration_data());
	browser.runtime.sendMessage("reload");
	}
/**
* If url pattern is valid save the data in a file 
**/

function export_data()
	{
	if (!isTargetValid(document.getElementById('targetPage').value))
		{
			alert("Can not export : Url pattern  is invalid");
			return;
		}
	// Save in local storage
	save_data();
	// Create file data
	var to_export= create_configuration_data();
	
	// Create file to save 
	var a         = document.createElement('a');
	a.href        = 'data:attachment/json,' +  encodeURIComponent(to_export);
	a.target      = 'download';
	a.download    = 'SimpleModifyHeader.conf';
	
	// use iframe "download" to put the link (in order not to be redirect in the parent frame)
	var myf = document.getElementById("download");
	myf = myf.contentWindow.document || myf.contentDocument;
	myf.body.appendChild(a);
	a.click();
	}
	

/**
* Choose a file and import data from the choosen file
*
**/
function import_data(evt)
	{
	// create an input field in the iframe
	if (window.confirm("This will erase your actual configuration, do you want to continue ?"))
		{
		var input = document.createElement("input");
		input.type="file";
		input.addEventListener('change', readSingleFile, false);
		var myf = document.getElementById("download");
		myf = myf.contentWindow.document || myf.contentDocument;
		myf.body.appendChild(input);
		input.click();
		}

	}

/**
* Import data from a file
*
* If format is not recognized , try modify header add-an file format
*
**/

function readSingleFile(e) 
	{
	var file = e.target.files[0];
	if (!file) {
    		return;
  		}
  	var reader = new FileReader();
  	reader.onload = function(e) 
		{
    	var contents = e.target.result;
		var config="";	
		try
			{
			config = JSON.parse(contents);
			// check file format
			if (config.format_version && config.target_page)
				{
				// if url pattern invalid , set to "" 
				if (!isTargetValid(config.target_page)) config.target_page=""; 
				// store the conf in the local storage 
				localStorage.setItem("config",contents);
				// load the new conf 
				browser.runtime.sendMessage("reload");
				// reload the configuration page with the new conf
				document.location.href="config.html";
				}
			else 
				{
				// try modify header add-on file format  : array of {action,name,value,comment,enabled}
				if (config[0].action)
					{
					var headers = [];
					for (var line_to_load of config)
						{
						var enabled = "off"; 
						if (line_to_load.enabled) enabled = "on"
						if (line_to_load.action=="Filter") line_to_load.action="delete";
						headers.push({action:line_to_load.action.toLowerCase(),header_name:line_to_load.name,header_value:line_to_load.value,comment:line_to_load.comment,status:enabled});
						}
					var to_load = {format_version:"1.0",target_page:"",headers:headers};
					
					// store the conf in the local storage 
					localStorage.setItem("config",JSON.stringify(to_load));
					// load the new conf 
					browser.runtime.sendMessage("reload");
					// reload the configuration page with the new conf
					document.location.href="config.html";	
					}
				else  alert("invalid file format");
				}
			}
		catch(error) 
			{
  			console.log(error);
			alert("Invalid file format");
			}
  		};
  	reader.readAsText(file);
	}


/**
* Delete a configuration line on the UI 
**/
function delete_line(line_number_to_delete)
	{
	if (line_number_to_delete != line_number) 
			{
			for (i=line_number_to_delete;i<line_number-1;i++)
				{
				var j = i+1;
				document.getElementById("select_action"+i).value = document.getElementById("select_action"+j).value;
				document.getElementById("header_name"+i).value = document.getElementById("header_name"+j).value;
				document.getElementById("header_value"+i).value = document.getElementById("header_value"+j).value;
				document.getElementById("comment"+i).value = document.getElementById("comment"+j).value;
				document.getElementById("select_status"+i).value = document.getElementById("select_status"+j).value;
				}
			}
	var Node_to_delete = document.getElementById("line"+(line_number-1));
    Node_to_delete.parentNode.removeChild(Node_to_delete);
	line_number--;
	}

/**
* Stop or Start modify header
**/
function start_modify()
	{
	if (started=="off") 
		{
		localStorage.setItem("started","on");
		browser.runtime.sendMessage("on");
		started = "on";
		document.getElementById("start_img").src = "img/stop.png";		
		}
	else 
		{
		localStorage.setItem("started","off");
		browser.runtime.sendMessage("off");
		started = "off";
		document.getElementById("start_img").src = "img/start.png";
		}

	}
