/*
 * ========================================
 *  博客核心逻辑 —— 无需修改，新增文章去 articles-data.js
 * ========================================
 */
(function () {
	/* 从 articles-data.js 读取全局文章数据 */
	var articles = window.uniBlogData || [];

	// ====== 首页分页参数 ======
	var currentPage = 1;      // 当前页码
	var pageSize = 6;         // 每页显示 6 篇文章卡片
	var order = "desc";       // 排序方式："desc"=最新优先 / "asc"=最早优先
	var currentCategory = null; // 当前分类过滤（null=全部）
	var searchTerm = "";      // 当前搜索关键词（空=全部）
	var searchTimer = null;   // 搜索去抖定时器

	/* 读取 URL 参数 ?category=xxx，如果有则启用分类过滤 */
	var params = new URLSearchParams(window.location.search);
	if (params.get("category")) {
		currentCategory = decodeURIComponent(params.get("category"));
	}

	/* 根据分类过滤 + 搜索关键词过滤 + 排序，返回最终的文章列表 */
	function getFilteredArticles() {
		var list = articles.slice();

		/* 分类筛选 */
		if (currentCategory) {
			list = list.filter(function (a) { return a.category === currentCategory; });
		}

		/* 搜索筛选：匹配标题 / 摘要 / 分类名 / 章节标题 / 正文（不区分大小写） */
		if (searchTerm.trim()) {
			var kw = searchTerm.trim().toLowerCase();
			list = list.filter(function (a) {
				if (!a.title) return false;
				if (a.title.toLowerCase().indexOf(kw) >= 0) return true;
				if (a.summary && a.summary.toLowerCase().indexOf(kw) >= 0) return true;
				if (a.category && a.category.toLowerCase().indexOf(kw) >= 0) return true;
				var content = a.content || [];
				for (var i = 0; i < content.length; i++) {
					var sec = content[i];
					if (sec.heading && sec.heading.toLowerCase().indexOf(kw) >= 0) return true;
					if (sec.body && sec.body.toLowerCase().indexOf(kw) >= 0) return true;
				}
				return false;
			});
		}

		list.sort(function (a, b) {
			if (order === "desc") return b.date.localeCompare(a.date);
			return a.date.localeCompare(b.date);
		});
		return list;
	}

	/* 渲染单篇文章卡片 HTML（标题、日期、分类标签、摘要） */
	function buildCardHTML(a) {
		return '<div style="text-align:left; padding:18px 30px;">'
			+ '<h3 style="margin:0 0 6px 0;"><a href="article.html?id=' + a.id + '" style="color:#333; text-decoration:none;">' + a.title + '</a></h3>'
			+ '<span style="font-size:12px; color:#999;">' + a.date + '</span>'
			+ '<span style="display:inline-block; margin-left:12px; font-size:12px; background:#f9cd90; color:#333; padding:2px 10px; border-radius:10px;">' + a.category + '</span>'
			+ '<p style="margin-top:10px; color:#666; font-size:14px; line-height:1.6;">' + a.summary + '</p>'
			+ '</div>';
	}

	/* 首页渲染：每页 6 篇文章卡片 + 排序按钮 + 分页按钮 + 分类标题 */
	function render() {
		var list = getFilteredArticles();
		var totalPages = Math.ceil(list.length / pageSize) || 1;
		if (currentPage > totalPages) currentPage = totalPages;
		if (currentPage < 1) currentPage = 1;

		var start = (currentPage - 1) * pageSize;
		var pageItems = list.slice(start, start + pageSize);

		/* 填充 6 个文章卡片容器，多余的隐藏 */
		var cards = document.querySelectorAll("#youlan .wenZhang");

		/* 搜索无结果时，用第一张卡片显示提示 */
		if (searchTerm.trim() && list.length === 0) {
			cards.forEach(function (card, i) {
				if (i === 0) {
					card.textContent = "没有找到包含 \"" + searchTerm.trim() + "\" 的文章";
					card.style.textAlign = "center";
					card.style.color = "#999";
					card.style.padding = "40px 0";
					card.style.display = "block";
				} else {
					card.style.display = "none";
				}
			});
		} else {
			cards.forEach(function (card, i) {
				if (i < pageItems.length) {
					card.innerHTML = buildCardHTML(pageItems[i]);
					card.style.display = "block";
				} else {
					card.style.display = "none";
				}
			});
		}

		/* 页面标题：搜索中 → "搜索：xxx"，分类中 → 分类名，否则 → "全部文章" */
		var titleEl = document.querySelector("#youlan .pageTitle");
		if (titleEl) {
			if (searchTerm.trim()) {
				titleEl.textContent = "\u641c\u7d22\uff1a" + searchTerm.trim() + "  (" + list.length + " \u7bc7)";
			} else if (currentCategory) {
				titleEl.textContent = currentCategory;
			} else {
				titleEl.textContent = "\u5168\u90e8\u6587\u7ae0";
			}
		}

		/* 分页按钮区：排序切换 / 清除筛选 / 上下页 / 页码 / 总页数 */
		var pager = document.querySelector("#youlan .fenYeRongQi");
		if (pager) {
			var html = "";

			/* 搜索无结果时仅显示排序按钮 */
			if (searchTerm.trim() && list.length === 0) {
				html += '<button class="fenYeBtn" onclick="uniBlog.toggleOrder()">' + (order === "desc" ? "\u2193 最新优先" : "\u2191 最早优先") + '</button>';
				html += '<span style="font-size:14px; color:#999;">暂无匹配文章</span>';
				pager.innerHTML = html;
				return;
			}

			// 排序切换按钮
			html += '<button class="fenYeBtn" onclick="uniBlog.toggleOrder()">' + (order === "desc" ? "\u2193 最新优先" : "\u2191 最早优先") + '</button>';

			// 如果当前是分类过滤状态，显示"清除筛选"按钮
			if (currentCategory) {
				html += '<a href="index.html" class="fenYeBtn">\u2715 清除筛选</a>';
			}

			// 上一页按钮（第一页时禁用）
			html += '<button class="fenYeBtn" onclick="uniBlog.goTo(' + (currentPage - 1) + ')"' + (currentPage <= 1 ? " disabled" : "") + '>上一页</button>';

			// 页码按钮（当前页高亮）
			for (var i = 1; i <= totalPages; i++) {
				html += '<button class="fenYeBtn' + (i === currentPage ? " fenYeBtnActive" : "") + '" onclick="uniBlog.goTo(' + i + ')">' + i + '</button>';
			}

			// 下一页按钮（最后一页时禁用）
			html += '<button class="fenYeBtn" onclick="uniBlog.goTo(' + (currentPage + 1) + ')"' + (currentPage >= totalPages ? " disabled" : "") + '>下一页</button>';

			// 总页数 / 总文章数
			html += '<span style="margin-left:10px; font-size:14px; color:#999;">共 ' + totalPages + ' 页 / ' + list.length + ' 篇</span>';

			// 页码跳转输入框（总页数 > 1 时显示）
			if (totalPages > 1) {
				html += '<span style="margin-left:10px; font-size:13px; color:#999;">跳至</span>';
				html += '<input type="number" class="fenYeTiaoZhuan" min="1" max="' + totalPages + '" value="' + currentPage + '" onkeydown="if(event.key===\'Enter\')uniBlog.jumpTo(this)" />';
				html += '<span style="font-size:13px; color:#999;">页</span>';
				html += '<button class="fenYeBtn" onclick="uniBlog.jumpTo(this.previousElementSibling.previousElementSibling)">GO</button>';
			}

			pager.innerHTML = html;
		}
	}

	// ====== ARTICLE PAGE ======
	/* 文章详情页：读取 URL 的 ?id= 参数，渲染文章标题、元信息、正文 */
	function renderArticle() {
		var paramsArticle = new URLSearchParams(window.location.search);
		var id = parseInt(paramsArticle.get("id"));
		var article = null;
		for (var i = 0; i < articles.length; i++) {
			if (articles[i].id === id) { article = articles[i]; break; }
		}

		var contentEl = document.getElementById("articleContent");
		if (!article) {
			/* 未找到对应文章，显示提示信息 */
			if (contentEl) {
				contentEl.innerHTML = '<p style="text-align:center; color:#999; padding:100px 0;">文章不存在</p>';
			}
			return;
		}

		/* 动态设置浏览器标签页标题 */
		document.title = article.title + " - 温知小筑";

		/* 拼接 HTML：文章标题 + 日期/分类元信息 */
		var html = "<h1>" + article.title + "</h1>";
		html += '<div class="articleMeta"><span>' + article.date + '</span><span>' + article.category + '</span></div>';

		/* 遍历 content 数组，生成每个章节的 h2 标题 + p 正文 */
		for (var j = 0; j < article.content.length; j++) {
			var sec = article.content[j];
			html += '<h2 id="section-' + j + '">' + sec.heading + '</h2>';
			html += '<p>' + sec.body + '</p>';
		}

		if (contentEl) {
			contentEl.innerHTML = html;
		}

		/* 调用目录生成函数，在左侧边栏渲染导航 */
		buildTOC(article);
	}

	/* 构建左侧 sticky 目录：点击平滑滚动到对应章节 + 滚动时自动高亮当前章节 */
	function buildTOC(article) {
		var tocEl = document.getElementById("tocList");
		if (!tocEl) return;

		/* 根据文章 content 数组生成目录项列表 */
		var html = "";
		for (var i = 0; i < article.content.length; i++) {
			html += '<li><a href="#section-' + i + '" data-index="' + i + '">' + article.content[i].heading + '</a></li>';
		}
		tocEl.innerHTML = html;

		/* 点击目录项 → 平滑滚动到对应章节锚点 */
		tocEl.addEventListener("click", function (e) {
			if (e.target.tagName === "A") {
				e.preventDefault();
				var targetId = e.target.getAttribute("href").substring(1);
				var target = document.getElementById(targetId);
				if (target) {
					target.scrollIntoView({ behavior: "smooth", block: "start" });
				}
			}
		});

		/* 默认高亮第一个目录项 */
		var tocLinks = tocEl.querySelectorAll("a");
		if (tocLinks.length > 0) {
			tocLinks[0].classList.add("toc-active");
		}

		/* 监听页面滚动，检测当前可视章节并自动高亮对应目录项 */
		window.addEventListener("scroll", function () {
			var scrollPos = window.scrollY + 120; // 偏移量补偿，确保提前触发切换
			for (var i = article.content.length - 1; i >= 0; i--) {
				var heading = document.getElementById("section-" + i);
				if (heading && heading.offsetTop <= scrollPos) {
					for (var k = 0; k < tocLinks.length; k++) {
						tocLinks[k].classList.remove("toc-active");
					}
					if (tocLinks[i]) tocLinks[i].classList.add("toc-active");
					break;
				}
			}
		});
	}

	// ====== EXPORT ======
	/* 暴露到全局，供分页按钮的 onclick 调用 */
	window.uniBlog = {
		goTo: function (page) {
			currentPage = page;
			render();
			window.scrollTo({ top: 0, behavior: "smooth" }); // 切页后回到顶部
		},
		toggleOrder: function () {
			order = order === "desc" ? "asc" : "desc";
			currentPage = 1;
			render();
		},
		jumpTo: function (input) {
			var page = parseInt(input.value, 10);
			var max = parseInt(input.max, 10);
			if (isNaN(page) || page < 1) page = 1;
			if (page > max) page = max;
			currentPage = page;
			render();
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	// ====== INIT ======
	/* DOM 加载完成后自动判断当前页面类型并执行对应渲染 */
	document.addEventListener("DOMContentLoaded", function () {
		if (document.getElementById("articleContent")) {
			/* 存在 #articleContent → 是文章详情页 → 调用 renderArticle() */
			renderArticle();
		} else if (document.querySelector("#youlan")) {
			/* 存在 #youlan → 是首页 → 调用 render() */
			render();

			/* 搜索栏交互（文章下拉候选 + 高亮上下文 + 点击跳转） */
			var searchInput = document.getElementById("searchInput");
			var searchClear = document.getElementById("searchClear");
			var suggestEl = document.getElementById("searchSuggest");

			if (searchInput && searchClear && suggestEl) {
				var selectedIndex = -1;

				/* 高亮匹配文本 */
				function highlight(keyword, kw) {
					var idx = keyword.toLowerCase().indexOf(kw.toLowerCase());
					if (idx < 0) return keyword;
					return keyword.substring(0, idx)
						+ '<span class="souSuoGaoLiang">' + keyword.substring(idx, idx + kw.length) + '</span>'
						+ keyword.substring(idx + kw.length);
				}

				/* 从文章摘要 / 章节标题 / 正文提取关键词上下文（前后各 10 字） */
				function getContext(article, kw) {
					var sources = [];
					if (article.summary) sources.push(article.summary);
					(article.content || []).forEach(function (sec) {
						if (sec.heading) sources.push(sec.heading);
						if (sec.body) sources.push(sec.body);
					});
					for (var i = 0; i < sources.length; i++) {
						var idx = sources[i].toLowerCase().indexOf(kw.toLowerCase());
						if (idx >= 0) {
							var start = Math.max(0, idx - 10);
							var end = Math.min(sources[i].length, idx + kw.length + 10);
							var prefix = start > 0 ? '...' : '';
							var suffix = end < sources[i].length ? '...' : '';
							return prefix + sources[i].substring(start, end) + suffix;
						}
					}
					return '';
				}

				/* 匹配文章：标题 / 摘要 / 分类 / 章节标题 / 正文 */
				function matchArticles(kw) {
					var lk = kw.toLowerCase();
					return articles.filter(function (a) {
						if (!a.title) return false;
						if (a.title.toLowerCase().indexOf(lk) >= 0) return true;
						if (a.summary && a.summary.toLowerCase().indexOf(lk) >= 0) return true;
						if (a.category && a.category.toLowerCase().indexOf(lk) >= 0) return true;
						var c = a.content || [];
						for (var j = 0; j < c.length; j++) {
							var sec = c[j];
							if (sec.heading && sec.heading.toLowerCase().indexOf(lk) >= 0) return true;
							if (sec.body && sec.body.toLowerCase().indexOf(lk) >= 0) return true;
						}
						return false;
					});
				}

				/* 渲染文章下拉候选列表 */
				function showArticleSuggest(val) {
					var kw = val.trim().toLowerCase();
					if (!kw) { hideSuggest(); return; }

					var matches = matchArticles(kw).slice(0, 8);

					if (matches.length === 0) { hideSuggest(); return; }

					suggestEl.innerHTML = matches.map(function (a) {
						var ctx = getContext(a, kw);
						var html = '<li class="souSuoHouXuan" data-id="' + a.id + '">'
							+ '<span class="souSuoBiaoTi">' + highlight(a.title, val) + '</span>';
						if (ctx) {
							html += '<span class="souSuoShangXiaWen"> — ' + highlight(ctx, val) + '</span>';
						}
						html += '</li>';
						return html;
					}).join("");
					suggestEl.classList.add("souSuoXiaLa--keJian");
					suggestEl.scrollLeft = 0;
					selectedIndex = -1;
				}

				function hideSuggest() {
					suggestEl.classList.remove("souSuoXiaLa--keJian");
					suggestEl.innerHTML = "";
					selectedIndex = -1;
				}

				/* 高亮键盘选中项 */
				function updateSelected() {
					var items = suggestEl.querySelectorAll(".souSuoHouXuan");
					items.forEach(function (item, i) {
						item.classList.toggle("souSuoHouXuan--xuanZhong", i === selectedIndex);
					});
				}

				/* 跳转到文章详情页 */
				function goToArticle(item) {
					var id = item.getAttribute("data-id");
					if (id) window.location.href = "article.html?id=" + id;
				}

				/* 执行页面搜索过滤 */
				function doSearch() {
					hideSuggest();
					clearTimeout(searchTimer);
					searchTerm = searchInput.value;
					if (searchTerm) currentPage = 1;
					render();
				}

				/* input 事件 → 实时下拉 + 去抖过滤 */
				searchInput.addEventListener("input", function () {
					var val = searchInput.value;
					searchClear.classList.toggle("souSuoQingChu--keJian", val.length > 0);
					showArticleSuggest(val);
					clearTimeout(searchTimer);
					searchTimer = setTimeout(function () {
						searchTerm = val;
						if (val) currentPage = 1;
						render();
					}, 300);
				});

				/* 点击候选项 → 跳转文章页 */
				suggestEl.addEventListener("mousedown", function (e) {
					var item = e.target.closest(".souSuoHouXuan");
					if (item) { e.preventDefault(); goToArticle(item); }
				});

				/* 失焦 → 延迟关闭下拉 */
				searchInput.addEventListener("blur", function () {
					setTimeout(hideSuggest, 150);
				});

				/* 键盘导航 */
				searchInput.addEventListener("keydown", function (e) {
					var items = suggestEl.querySelectorAll(".souSuoHouXuan");
					var visible = suggestEl.classList.contains("souSuoXiaLa--keJian");

					if (e.key === "ArrowDown") {
						e.preventDefault();
						if (!visible) { showArticleSuggest(searchInput.value); items = suggestEl.querySelectorAll(".souSuoHouXuan"); }
						if (items.length > 0) { selectedIndex = Math.min(selectedIndex + 1, items.length - 1); updateSelected(); }
					} else if (e.key === "ArrowUp") {
						e.preventDefault();
						if (items.length > 0) { selectedIndex = Math.max(selectedIndex - 1, 0); updateSelected(); }
					} else if (e.key === "Enter") {
						if (visible && selectedIndex >= 0 && items[selectedIndex]) {
							e.preventDefault();
							goToArticle(items[selectedIndex]);
							return;
						}
						doSearch();
					} else if (e.key === "Escape") {
						hideSuggest();
					}
				});

				/* 清空按钮 */
				searchClear.addEventListener("click", function () {
					searchInput.value = "";
					searchClear.classList.remove("souSuoQingChu--keJian");
					hideSuggest();
					searchTerm = "";
					render();
					searchInput.focus();
				});

				/* 搜索按钮 */
				var searchBtn = document.getElementById("searchBtn");
				if (searchBtn) {
					searchBtn.addEventListener("click", doSearch);
				}
			}
		}
	});
})();
