const ProductCategory = require("../../models/product-category.model");
const systemConfig = require("../../config/system");

const createTreeHelpers = require("../../helpers/createTree");
const searchHelper = require("../../helpers/search");

// [GET] /admin/products-category
module.exports.index = async (req, res) => {
  let find = {
    deleted: false,
  };

  const objectSearch = searchHelper(req.query);
  // console.log(objectSearch);
  if (objectSearch.regex) {
    find.title = objectSearch.regex;
  }
  //sort
  let sort = {};

  if (req.query.sortKey && req.query.sortValue) {
    const sortMG = req.query.sortValue === "asc" ? 1 : -1;
    sort[req.query.sortKey] = sortMG;
  } else {
    sort.position = -1;
  }
  // end sort

  const records = await ProductCategory.find(find).sort(sort);

  const newRecords = createTreeHelpers.tree(records);

  res.render("admin/pages/products-category/index", {
    pageTitle: "Danh mục sản phẩm",
    keyword: objectSearch.keyword,
    records: newRecords,
  });
};

// [GET] /admin/products-category/create
module.exports.create = async (req, res) => {
  let find = {
    deleted: false,
  };

  const records = await ProductCategory.find(find);

  const newRecords = createTreeHelpers.tree(records);
  res.render("admin/pages/products-category/create", {
    pageTitle: "Tạo danh mục sản phẩm",
    records: newRecords,
  });
};

//[POST] /admin/products-category/create
module.exports.createPost = async (req, res) => {
  if (req.body.position == "") {
    const count = await ProductCategory.countDocuments();

    req.body.position = count + 1;
  } else {
    req.body.position = parseInt(req.body.position);
  }
  const record = new ProductCategory(req.body);
  await record.save();
  res.redirect(`${systemConfig.prefixAdmin}/products-category`);
};

//[PATCH] change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  await ProductCategory.updateOne({ _id: id }, { status: status });

  req.flash("success", "Cập nhật thành công!");

  res.redirect("back");
};

//[DELETE] /admin/products-category/delete/:id
module.exports.deleteItem = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  await ProductCategory.deleteOne(
    { _id: id },
    { deleted: true, deletedAt: new Date() }
  );
  req.flash("success", `Đã xóa thành công sản phẩm!`);
  res.redirect("back");
};

//[GET] /admin/products-category/detail/:id
module.exports.detailCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findOne({
      deleted: false,
      _id: req.params.id,
    });

    if (!category) {
      return res.redirect(`${systemConfig.prefixAdmin}/products-category`);
    }

    let parentCategory = null;
    if (category.parent_id) {
      parentCategory = await ProductCategory.findOne({
        _id: category.parent_id,
        deleted: false,
      });
    }

    res.render("admin/pages/products-category/detail", {
      pageTitle: category.title,
      category: category,
      parentCategory: parentCategory,
    });
  } catch (error) {
    res.redirect(`${systemConfig.prefixAdmin}/products-category`);
  }
};

//[GET] /admin/products/edit/:id
module.exports.editCategory = async (req, res) => {
  try {
    const product = await ProductCategory.findOne({
      _id: req.params.id,
      deleted: false,
    });
    const records = await ProductCategory.find({
      deleted: false,
    });
    const newRecords = createTreeHelpers.tree(records);
    res.render("admin/pages/products-category/edit", {
      pageTitle: "Chỉnh sửa danh mục",
      product: product,
      records: newRecords,
    });
  } catch (error) {
    res.redirect(`${systemConfig.prefixAdmin}/products-category`);
  }
};

//[PATCH] /admin/products/edit/:id
module.exports.editPatchCategory = async (req, res) => {
  const id = req.params.id;
  req.body.position = parseInt(req.body.position);

  if (req.file && req.file.path) {
    req.body.thumbnail = req.file.path; // SAI nếu không có req.file.path
  }

  try {
    await ProductCategory.updateOne({ _id: id }, req.body);
    req.flash("success", " Cập nhật thành công");
  } catch (error) {
    req.flash("error", "Cập nhật thất bại");
  }
  const redirectUrl = `${systemConfig.prefixAdmin}/products-category`;
  res.redirect(redirectUrl);
};
