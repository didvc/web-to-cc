ROOT := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
PREFIX ?= $(HOME)/.local
BIN := $(PREFIX)/bin/web-to-cc
CDP_PORT ?= 9555

.PHONY: help test e2e figs install uninstall userscript clean

help:
	@echo 'test        unit tests'
	@echo 'e2e         live export from the open claude.ai tab + resume check (CDP_PORT=$(CDP_PORT))'
	@echo 'figs        rebuild the docs figures with typst'
	@echo 'install     symlink web-to-cc into $(PREFIX)/bin'
	@echo 'uninstall   remove that symlink'
	@echo 'userscript  path to install in Tampermonkey'
	@echo 'clean       drop e2e scratch output'

test:
	node --test 'test/*.test.mjs'

e2e:
	CDP_PORT=$(CDP_PORT) node test/e2e.mjs

figs:
	@for f in $(ROOT)/docs/fig-*.typ; do typst compile --ppi 200 $$f $${f%.typ}.png && echo $${f%.typ}.png; done

install:
	@mkdir -p $(PREFIX)/bin
	ln -sf $(ROOT)/web-to-cc.mjs $(BIN)
	@echo $(BIN)

uninstall:
	rm -f $(BIN)

userscript:
	@echo file://$(ROOT)/web-to-cc.user.js

clean:
	rm -rf $(ROOT)/.e2e
