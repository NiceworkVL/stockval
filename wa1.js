window.onload = function () {
		document.getElementById("getFinData").onclick = function () {
			getFinData(document.getElementById("symbol").value);
		}
}

function getFinData(symbol) {
	request = new XMLHttpRequest();
	if (request == null) {
		alert("Failed to create request");
		return;

	}

	var url="/cgi-bin/wa1.cgi?symbol="+symbol;
	request.open("GET",url,true);
	request.onreadystatechange = processData;
	request.send(null);
}


/* vars used in valuations */
var oe_ps, depr_ps, capex_ps, cash_ps, totdebt_ps;
var taxRate, ocf_ps, sales_ps;
var eff_cash_ps; /* cash after repatriation of overseas held cash */
var exc_eqcash_ps; /* excess cash in equity */

function processData() {
	if (request.readyState == 4) {
		if (request.status == 200) {
			var data = JSON.parse(request.responseText);
			/*
			if (data != null)
			    alert(Object.keys(data).length);
			*/
		} else {
			alert("Failed to get data: code = "+request.status);
			return;
		}
	}

	/* --- place scraped data on page */
	var df = "", dfc = "", dfc1 = "", dfc2 = "", crElemF = false;

	/* vars used in calculations */
	/* inc-st vars */
	var dilShares = 0, sales = 0, ebit = 0, pretaxInc = 0, incTax = 0; 
	var depr = 0, intExp = 0;
	/* bs-st vars */
	var cash = 0, ltInvCash = 0, stDebt = 0, ltDebt = 0, ltNoteR = 0;
	/* cf-st vars */
	var ocf = 0, capex = 0;
	var intcov = 0;

	for (var key in data) {
		//alert(key+data[key]);
		if (key == "header") {
			df = document.getElementById("output-header");
			if (df.childElementCount == 0) {
				dfc1 = document.createElement("h1");
				df.appendChild(dfc1);
				dfc2 = document.createElement("h4");
				df.appendChild(dfc2);

				dfc = document.createElement("span");
				dfc.setAttribute("class","label-valuation");
				dfc.innerHTML = "Fair Value";
				df.appendChild(dfc);
				dfc = document.createElement("span");
				dfc.setAttribute("class","data-valuation");
				dfc.setAttribute("id","fval");
				df.appendChild(dfc);
			} else {
				dfc1 = df.getElementsByTagName("h1")[0];
				dfc2 = df.getElementsByTagName("h4")[0];
			}

			for (var item in data[key]) {
				if (item == "companyName")
					dfc1.innerHTML = data[key][item];
				else if (item == "tickerName")
					dfc2.innerHTML = data[key][item];
				else if (item == "exchangeName")
					dfc2.innerHTML += " "+ data[key][item];
			}
		/* header elements done */
		} else if ((key == "income-statement")
			    || (key == "balance-sheet") 
			    || (key == "cash-flow")) {
			df = document.getElementById(key);
			if (df.childElementCount == 0) {
				crElemF = true;
				dfc = document.createElement("h4");
				dfc.innerHTML = key;
				df.appendChild(dfc);
			} else {
				dfc = df.getElementsByTagName("h4")[0];
				crElemF = false;
			}


			var i = 0, arr = "", val;
			var ucf = 1; /* unit conversion factor,=1 for USD mil */
			for (var item in data[key]) {
				if (crElemF) {
					dfc = document.createElement("div");
					dfc.setAttribute("class","line-item");
					df.appendChild(dfc);
					dfc1 = document.createElement("span");
					dfc1.setAttribute("class","label");
					dfc.appendChild(dfc1);
					dfc2 = document.createElement("span");
					dfc2.setAttribute("class","data");
					dfc.appendChild(dfc2);
				} else {
					dfc = df.getElementsByTagName("div")[i++];
					arr = dfc.getElementsByTagName("span");
					dfc1 = arr[0]; /* label */
					dfc2 = arr[1]; /* data */
				}
				dfc1.innerHTML = item;
				dfc2.innerHTML = val = data[key][item];

			 	if (item == "Data Unit") {
					dfc2.setAttribute("id",key+"-units");
					if (val == "USD Millions")
						ucf = 1;
					else if (val == "USD Thousands")
						ucf = 0.001; /* convert to mil */
				}

				/* transfer values to vars used in calculations */
				if (key == "income-statement") { 
					if (item == "Sales/Revenue")
					   sales = ucf*(+val.replace(/[,()]/g,""));
					else if (item == "EBIT")
					   ebit = ucf*(+val.replace(/,/g,""));
					else if (item == 
					  "Depreciation & Amortization Expense")
					   depr  = ucf*(+val.replace(/,/g,""));
			 		else if (item == "Interest Expense")
					   intExp  = ucf*(+val.replace(/,/g,""));
			 		else if (item == "Pretax Income")
					   pretaxInc  = ucf*(+val.replace(/,/g,""));
			 	        else if (item == "Income Tax")
					   incTax  = ucf*(+val.replace(/,/g,""));
			 	        else if (item ==
					  "Diluted Shares Outstanding")
					   dilShares  = ucf*(+val.replace(/,/g,""));
				} else if (key == "balance-sheet") {
					if (item == "Cash & Short Term Investments")
					   cash  = ucf*(+val.replace(/,/g,""));
					else if (item == "Long-Term Note Receivable")
					   ltNoteR  = ucf*(+val.replace(/,/g,""));
					else if (item ==
					  "Other Long-Term Investments")
					   ltInvCash  = ucf*(+val.replace(/,/g,""));
					else if (item ==
					  "ST Debt & Current Portion LT Debt")
					   stDebt  = ucf*(+val.replace(/,/g,""));
					else if (item == "Long-Term Debt")
					   ltDebt  = ucf*(+val.replace(/,/g,""));
				} else if (key == "cash-flow") {
			 		if (item == "Net Operating Cash Flow")
					   ocf = ucf*(+val.replace(/[,()]/g,""));
					else if (item == "Capital Expenditures")
					   capex  = ucf*(+val.replace(/[,()]/g,""));
				}
			}
		}
		/* fin-data elements done */
	}
	/* all data elements done */

	/* --- derive info from data */
	sales_ps = sales/dilShares;
	oe_ps = (ebit != 0) ? (ebit/dilShares) : ((pretaxInc+intExp)/dilShares);
	depr_ps = depr/dilShares;
	capex_ps = capex/dilShares;
	eff_cash_ps = cash_ps = (cash+ltInvCash)/dilShares;
	totdebt_ps = (stDebt+ltDebt-ltNoteR)/dilShares;
	taxRate = incTax/pretaxInc;
	ocf_ps = ocf/dilShares;
	exc_eqcash_ps = Math.max((cash_ps - 0.05*sales_ps),0);
	intcov = ((ebit !=0) ? ebit : (pretaxInc+intExp))/intExp;

	/* display calculations */
	var i = 0, arr, val_ps = 0;
	df = document.getElementById("calculations");

	/* sales p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Sales p.s.";
	arr[1].innerHTML = sales_ps.toFixed(2);

	/* Op.Earnings p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Operating Earnings p.s.";
	arr[1].innerHTML = oe_ps.toFixed(2);

	/* OCF p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "OCF p.s.";
	arr[1].innerHTML = ocf_ps.toFixed(2);

	/* capex p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Capex p.s.";
	arr[1].innerHTML = capex_ps.toFixed(2);

	/* Depreciation p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "D&A p.s.";
	arr[1].innerHTML = depr_ps.toFixed(2);

	/* Cash p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Cash & ST Inv. p.s.";
	arr[1].innerHTML = cash_ps.toFixed(2);
	arr[1].setAttribute("id","cashps");

	/* Total Debt p.s. */
	if (crElemF) crDisplayRow("calculations");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Total Debt p.s.";
	arr[1].innerHTML = totdebt_ps.toFixed(2);

	/* display derived values */
	i = 0; df = document.getElementById("derived");
	/* Tax Rate */
	if (crElemF) crDisplayRow("derived");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Tax Rate (%)";
	arr[1].innerHTML = (100*taxRate).toFixed(2);

	/* Excess Cash in equity p.s. */
	if (crElemF) crDisplayRow("derived");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Excess cash in equity p.s.";
	arr[1].innerHTML = exc_eqcash_ps.toFixed(2);
	arr[1].setAttribute("id","exc-eqcashps");

	/* Interest coverage */
	if (crElemF) crDisplayRow("derived");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	arr[0].innerHTML = "Interest Coverage";
	arr[1].innerHTML = intcov.toFixed(2);
	
	/* display valuations */
	i = 0; df = document.getElementById("valuation");
	/* EB value display */
	/* Earnings discount */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "Earnings/OCF discount (%)";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "text");
		dfc.setAttribute("class","input");
		dfc.setAttribute("id","earn-disc");
		dfc.size = "5";
		dfc.defaultValue = "0";
		arr[1].appendChild(dfc);
	}
	dfc = document.getElementById("earn-disc");
	dfc.value = dfc.defaultValue;

	/* Cash held abroad */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "Cash held abroad (%)";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "text");
		dfc.setAttribute("class","input");
		dfc.setAttribute("id","cash-abroad");
		dfc.size = "5";
		dfc.defaultValue = "0";
		dfc.onchange = function () {
			var dfc = document.getElementById("cash-abroad");
			eff_cash_ps = (1-(+dfc.value/100)*taxRate)*cash_ps;
			exc_eqcash_ps = Math.max((eff_cash_ps-0.05*sales_ps),0);

			var dfc1 = document.getElementById("exc-eqcashps");
			dfc1.innerHTML = exc_eqcash_ps.toFixed(2);
		}
		arr[1].appendChild(dfc);
	}
	dfc = document.getElementById("cash-abroad");
	dfc.value = dfc.defaultValue;

	/* EB Value */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "EB Value p.s.";
		arr[0].setAttribute("class","label-valuation");
		arr[1].setAttribute("id","ebval");
		arr[1].setAttribute("class","data-valuation");
	}
	val_ps = calcEBV();
	arr[1].innerHTML = val_ps.toFixed(2);

	/* DCF value display */
	/* OCF Growth Rate - Y1-Y5 */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "OCF Growth Rate Y1-Y5 (%)";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "text");
		dfc.setAttribute("class","input");
		dfc.setAttribute("id","GR5y");
		dfc.size = "5";
		dfc.defaultValue = "3";
		arr[1].appendChild(dfc);
	}
	dfc = document.getElementById("GR5y");
	dfc.value = dfc.defaultValue;

	/* OCF Growth Rate - Y15-Y20 */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "OCF Growth Rate Y5-Y20 (%)";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "text");
		dfc.setAttribute("class","input");
		dfc.setAttribute("id","GR15y");
		dfc.size = "5";
		dfc.defaultValue = "1.8";
		arr[1].appendChild(dfc);
	}
	dfc = document.getElementById("GR15y");
	dfc.value = dfc.defaultValue;

	/* Discount Rate */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "Discount Rate (%)";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "text");
		dfc.setAttribute("class","input");
		dfc.setAttribute("id","disc-rate");
		dfc.size = "5";
		dfc.defaultValue = "10";
		arr[1].appendChild(dfc);
	}
	dfc = document.getElementById("disc-rate");
	dfc.value = dfc.defaultValue;

	/* DCF Value */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "DCF Value p.s.";
		arr[0].setAttribute("class","label-valuation");
		arr[1].setAttribute("id","dcfval");
		arr[1].setAttribute("class","data-valuation");
	}
	val_ps = calcDCFV();
	arr[1].innerHTML = val_ps.toFixed(2);
	
	/* Calculate Value button */
	if (crElemF) crDisplayRow("valuation");
	dfc = df.getElementsByTagName("div")[i++];
	arr = dfc.getElementsByTagName("span");
	if (crElemF) {
		arr[0].innerHTML = "";
		dfc = document.createElement("input");
		dfc.setAttribute("type", "button");
		dfc.value = "Calculate";
		dfc.onclick = function () {
			var val_ps = calcEBV();
			var dfc = document.getElementById("ebval");
			dfc.innerHTML = val_ps.toFixed(2);

			val_ps = calcDCFV();
			dfc = document.getElementById("dcfval");
			dfc.innerHTML = val_ps.toFixed(2);

			val_ps = calcFV();
			dfc = document.getElementById("fval");
			dfc.innerHTML = val_ps.toFixed(2);
		}
		arr[1].appendChild(dfc);
	}

	dfc = document.getElementById("fval");
	dfc.innerHTML = calcFV().toFixed(2);
}

function crDisplayRow(id) {
	var df = document.getElementById(id);
	var dfc = document.createElement("div");
	dfc.setAttribute("class","line-item");
	df.appendChild(dfc);
	var dfc1 = document.createElement("span");
	dfc1.setAttribute("class","label");
	dfc.appendChild(dfc1);
	dfc1 = document.createElement("span");
	dfc1.setAttribute("class","data");
	dfc.appendChild(dfc1);
}

function calcEBV() {
	var cllr = 6.55/100; /* commercial loan interest rate = 6.55% */

	var df = document.getElementById("earn-disc");
	var earn_disc = +df.value/100;

	return (((1-earn_disc)*(oe_ps-Math.max((capex_ps-depr_ps),0)))/cllr - (totdebt_ps-eff_cash_ps));
}

function calcDCFV() {
	var df = document.getElementById("earn-disc");
	var ocf_disc = +df.value/100;
	df = document.getElementById("GR5y");
	var gr5y = +df.value/100;
	df = document.getElementById("GR15y");
	var gr15y = +df.value/100;
	df = document.getElementById("disc-rate");
	var disc_rate = +df.value/100;

	var perpgr = 0.5/100; /* perpetual growth rate = 0.5% */
	var a = (1+gr5y)/(1+disc_rate);
	var b = (1+gr15y)/(1+disc_rate);
	var c = (1+perpgr)/(disc_rate-perpgr)

	var dcfval = ((1-ocf_disc)*ocf_ps -capex_ps)*(
		((1-Math.pow(a,6))/(1-a)-1)
		+ Math.pow(a,5)*((1-Math.pow(b,16))/(1-b)-1)
		+ Math.pow(a,5)*Math.pow(b,15)*c )
	     + exc_eqcash_ps;

	return dcfval;
}


function calcFV() {
	var dfc1 = document.getElementById("ebval");
	var dfc2 = document.getElementById("dcfval");

	return ((+dfc1.innerHTML + 0.8*(+dfc2.innerHTML))/2); 
}
