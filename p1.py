from html.parser import HTMLParser
import requests,re,os,json,sys

class MyHTMLParser(HTMLParser):
    def __init__(self):
         super().__init__()
         self.flag = False
         self.pl_iter = 0
         self.data_item = ''
         self.section = ''
         self.fin_data = {}; self.fin_data['header'] = {}


    def handle_starttag(self, tag, attrs):
        if tag == 'option':
            #print(attrs)
            for a,v in attrs:
                if 'selected' in str(a):
                    for suffix in ['income-statement','balance-sheet','cash-flow']:
                        if attrs[0][1].endswith(suffix):
                           #print(tag,suffix)
                           self.section = suffix
                           self.fin_data[self.section] = {}
                           self.fin_data[self.section]['period'] = period
                           break
        elif tag == 'span':
            for a,v in attrs:
                if a == 'class':
                    if v in ('companyName','tickerName','exchangeName'):
                        self.data_item = v
        if self.flag:
            pass
            #print("start tag:", tag)


    def handle_data(self, data):
        if 'Fiscal year' in data:
            self.flag = True
            self.pl_iter = 6
            #print("data  :", data)
            m = re.search('USD[ a-zA-Z]+',data)
            self.fin_data[self.section]['Data Unit'] = m.group(0)
            self.data_item = 'Year'
        elif self.data_item in ('companyName','tickerName','exchangeName'):
            self.fin_data['header'][self.data_item] = data
            self.data_item = ''
        elif data in ['Sales/Revenue', 'Depreciation & Amortization Expense',\
                'EBIT', 'Interest Expense', 'Pretax Income', 'Income Tax',\
                'EPS (Diluted)', 'Diluted Shares Outstanding',\
                'Cash & Short Term Investments','Long-Term Note Receivable',\
                'Intangible Assets','Other Long-Term Investments',\
                'ST Debt & Current Portion LT Debt',\
                'Long-Term Debt','Total Shareholders\' Equity',\
                'Net Operating Cash Flow','Capital Expenditures']:
            self.flag = True
            self.pl_iter = 6
            #print("data  :", data)
            self.data_item = data

        if self.flag:
            if self.pl_iter == 6:
                self.pl_iter -= 1
            elif self.pl_iter > 0:
                if data != ' ':
                    #print("data  :", data)
                    if self.pl_iter == 4:
                        if data != '-':
                            self.fin_data[self.section][self.data_item] = data
                        else:
                            self.fin_data[self.section][self.data_item] = '0'
                    self.pl_iter -= 1
                    if self.pl_iter == 0:
                        self.flag = False

if len(sys.argv) == 1:
    print ("Ticker symbol not present")
    sys.exit()

ticker = sys.argv[1].upper()
filedir = os.path.expandvars('$HOME/project/webapp1/data/')
euid = str(os.geteuid())
data_file = filedir+'p1_data_'+ticker+'_'+euid+'.txt'
period = 'annual'
try:
    with open(data_file) as f:
        web_data = f.read()
except FileNotFoundError:
    web_data = ''
    with open(data_file,'w') as f:
        for s in ['income-statement','balance-sheet','cash-flow']:
            url = 'http://quotes.wsj.com/'+ticker+'/financials/annual/'+s
            page = requests.get(url)
            #print(page.text)
            f.write(page.text)
            web_data += page.text

parser = MyHTMLParser()
#parser.feed(page.text)

parser.feed(web_data)
parser.close()
"""
print('{} sections'.format(len(parser.fin_data)))
for key,val in parser.fin_data.items():
    print('Data from {}'.format(key))
    for a,b in val.items():
        print(a,':',b)
"""
print(json.dumps(parser.fin_data))
