var View;
View = {
	controller: null,
    reordered: function (path){
       // console.log('View.reordered ' + path);
        var i,z,template_option,template_options, container, index;
        if (path)
        {
            path = path.split('.');
            container = path.shift();
            if (path.length) index = path.shift();
        }

        if (this.options instanceof Array) template_options = this.options;
        else template_options = [this.options];
        z = template_options.length;
        for (i = 0; i < z; i ++)
        {
            template_option = template_options[i];
            if ((! container) || (template_option.container == container))
            {
                this.__reordered(template_option.container, template_option, index);
            }
        }
    },
    __reordered:function(path, options, index){
        var i,z,y,j,template,template_options,template_option,field;
        //console.log('View.__reordered: ' + path + ' ' + index);
        z = this.__getTemplateCount(path);
        for (i = 0; i < z; i++)
        {
            if ((index != null) && (i != index)) continue;

            template = this.__getTemplate(path, i);
            for (field in template.fields)
            {
                this.updated(path + '.' + i + '.' + field);
            }
            template_options = options.viewOptions;
            if (template_options)
            {
                if (! (template_options instanceof Array)) template_options = [template_options];
                y = template_options.length;
                for (j = 0; j < y; j++)
                {
                    template_option = template_options[j];
                    this.__reordered(path + '.' + i + '.' + template_option.container, template_option);
                }
            }
        }
    },
    inserted:function (path){
      //  console.log('View.inserted: ' + path)
        var options,container;
        options = this.__topOptions(path);
        if (options && options.container && options.container.length)
        {
            this.__inserted(path, this.__topContainers[options.container], options);
        }
        else console.error('View.inserted: ' + options)
    },
    updated: function(path){
        var info = this.__pathInfo(path);
        if (! (info && info.template && info.template.fields))
        {
            console.log('View.updated: UNFOUND ' + path);
        }
        else
        {
            if (info.template.fields[info.field]) this.controller.viewUpdated(path, info.template.fields[info.field]);
            else this.controller.viewUpdated(path, info.template.tag);
        }
    },
    setOptions:function(options, controller){
   		this.controller = controller;
        var object, i, z, container;
        if (options instanceof Array)
        {
            this.options = [];
            z = options.length;
            for (i = 0; i < z; i++)
            {
                this.options[i] = {};
                $.extend(true, this.options[i], options[i]);
                container = this.options[i].container;
                if (container && container.length) this.__topContainers[container] = $('#' + container);
            }
        }
        else
        {
            this.options = {};
            $.extend(true, this.options, options);
            container = this.options.container;
            if (container && container.length) this.__topContainers[container] = $('#' + container);
        }

        if (! this.__initialized) this.__initialize();
    },
    __topContainer:function(path){
        var options,container;
        options = this.__topOptions(path);
        if (options && options.container && options.container.length)
        {
            container = this.__topContainers[options.container];
        }
        return container;
    },
    __topOptions:function(path){
        var i,z,template_option,bits,container_name;
        if (! (this.options instanceof Array)) template_option = this.options;
        else
        {
            bits = path.split('.');
            container_name = bits.shift();

            z = this.options.length;
            for (i = 0; i < z; i ++)
            {
                template_option = this.options[i];
                if (container_name == template_option.container)
                {
                    break;
                }
                template_option = null;
            }
        }
        return template_option;
    },
    __topContainers:{},
    options:null,
	__addTemplate: function(path, data) {
		if (this.__templates[path] == null) this.__templates[path] = [];
		this.__templates[path].push(data);
	},
    __createTemplate: function(path, options){
        var template,i,z,option,container;
        template = {};
        if (! this.__originalTemplates[path]) {
            console.error('__createTemplate not found ' + path);
        }
        else {
            template.tag = this.__originalTemplates[path].clone();
            template.fields = this.__findTemplateFields(template.tag, options.fields);
            //template.fields[options.container] = template.tag;
            template.containers = [];
            template.container = options.container;
            template.ids = [];
            options = options.viewOptions;
            if (options)
            {
                if (! (options instanceof Array)) options = [options];
                z = options.length;
                for (i = 0; i < z; i++)
                {
                    option = options[i];
                    if (option.container)
                    {
                        container = template.tag.find('#' + option.container);
                        if (container.length)
                        {

                            if (container.attr('class') == undefined)
                            {
                                container.attr('class', option.container);
                            }
                            container.removeAttr('id');
                            template.ids.push(option.container);
                            template.containers.push(container);
                        }
                        else console.error('View.__createTemplate: UNFOUND ' + option.container);
                    }
                }
            }
        }
        return template;
    },
    __findTemplateFields: function(template, fields){
        var found_fields = {};
        var field,field_tag;
        if (fields && fields.length)
        {
            z = fields.length;
            for (i = 0; i < z; i++ )
            {
                field = fields[i];
                field_tag = template.find('#' + field);
                if (field_tag.attr('class') == undefined)
                {
                    field_tag.attr('class', field);
                }
                field_tag.removeAttr('id');
                found_fields[field] = field_tag;
            }
        }
        return found_fields;
    },
    __inserted: function(path, container, options){
        //console.warn('View.__inserted: ' + path);
        var j,y,i,z,item_path,template_container,template_option,template_options, original_key,template,container_key,field,info;
        original_key = this.__templatePath(path);

        j = this.__getTemplateCount(path);
        y = this.controller.viewCount(path);
        if (j >= y) console.warn('View.__inserted: ' + path + ' have ' + j + ' need ' + y);
        for (; j < y; j++) {
            item_path = path + '.' + j;

            template = this.__createTemplate(original_key, options);

            this.__addTemplate(path, template);
            container.append(template.tag);
            if (options.viewOptions)
            {
                template_options = options.viewOptions;
                if (! (template_options instanceof Array)) template_options = [template_options];
                z = template_options.length;
                for (i = 0; i < z; i++) {
                    template_option = template_options[i];
                    container_key = template.ids[i];
                    template_container = template.containers[i];
                    this.__inserted(item_path + '.' + container_key, template_container, template_option);
                }
            }
           // else console.warn('View.__inserted: no viewOptions ' + item_path);
            info = false;
            for (field in template.fields)
            {
                info = {};
                info.template = template;
                info.index = j;
                info.field = field;
                info.path = path;
                if (! template.fields[field]) console.error('View.__inserted: UNFOUND ' + field);
                else
                {
                    this.controller.viewInserted(item_path + '.' + field, template.fields[field]);
                    this.controller.viewUpdated(item_path + '.' + field, template.fields[field]);
                }

            }
            this.controller.viewInserted(item_path + '.' + options.container, template.tag);
            if (! info)
            {
                this.controller.viewUpdated(item_path + '.' + options.container, template.tag);

            }
        }
    },
    __pathInfo:function(path){
        var info,bits,last_bit, index;
        info = {};

        bits = path.split('.');
        last_bit = bits.pop();
        index = Number(last_bit);
        if (isNaN(index))
        {
            info.field = last_bit;
            last_bit = bits.pop();
            index = Number(last_bit);
        }
        if (! isNaN(index))
        {
            info.index = index;
            info.path = bits.join('.');
            info.template = this.__getTemplate(info.path, index);
        }
        return info;
    },
	__getTemplate: function (path, index){
        if ((this.__templates != null) && (this.__templates[path] != null) && (index < this.__templates[path].length))
        {
            return this.__templates[path][index];
        }
        return null;
	},
	__getTemplateCount: function (path){
		var count = 0;
		if ((this.__templates != null) && (this.__templates[path] != null))
		{
		   count = this.__templates[path].length;
		}
		return count;
	},
	__grabTemplates: function(options, path) {

		if (options instanceof Array)
		{
			var i,z;
			z = options.length;
			for (i =0; i < z; i++)
			{
				this.__grabTemplates(options[i], path);
			}
		}
		else
		{
			var template = $('#' + options.template);
			var template_path = (path ? path + '.' + options.container : options.container);

			this.__originalTemplates[template_path] = template;
			if (options.viewOptions && options.viewOptions)
			{
				this.__grabTemplates(options.viewOptions, template_path);
			}
			if (template.attr('class') == undefined)
			{
				template.attr('class', options.template);
			}
			template.removeAttr('id');
			template.remove();
		 }
	},
    __initialize:function(){
		this.__grabTemplates(this.options);
        __initialized = true;
    },
    __templatePath: function(path){
        var bits = path.split('.');
        var word_bits = [];
        var i,z;
        z = bits.length;
        for (i = 0; i < z; i++)
        {
            if (isNaN(Number(bits[i]))) word_bits.push(bits[i]);
        }
        return word_bits.join('.');
    },
    __templates: {},
	__originalTemplates: {},
   __initialized:false
}